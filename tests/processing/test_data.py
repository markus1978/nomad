# Copyright 2018 Markus Scheidgen
#
# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at
#
#   http://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an"AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.

from typing import Generator, Tuple
import pytest
from datetime import datetime
import os.path
import json
import re

from nomad import utils, infrastructure
from nomad.files import UploadFiles, StagingUploadFiles, PublicUploadFiles
from nomad.processing import Upload, Calc
from nomad.processing.base import task as task_decorator, FAILURE, SUCCESS

from tests.test_search import assert_search_upload
from tests.test_files import assert_upload_files
from tests.test_coe_repo import assert_coe_upload


def test_send_mail(mails, monkeypatch):
    monkeypatch.setattr('nomad.config.mail.enabled', True)
    infrastructure.send_mail('test name', 'test@email.de', 'test message', 'subjct')

    for message in mails.messages:
        assert re.search(r'test message', message.data.decode('utf-8')) is not None


@pytest.fixture(scope='function', autouse=True)
def mongo_forall(mongo):
    pass


@pytest.fixture
def uploaded_id_with_warning(raw_files) -> Generator[Tuple[str, str], None, None]:
    example_file = 'tests/data/proc/examples_with_warning_template.zip'
    example_upload_id = os.path.basename(example_file).replace('.zip', '')

    yield example_upload_id, example_file


def run_processing(uploaded: Tuple[str, str], test_user) -> Upload:
    uploaded_id, uploaded_path = uploaded
    upload = Upload.create(
        upload_id=uploaded_id, user=test_user, upload_path=uploaded_path)
    upload.upload_time = datetime.now()

    assert upload.tasks_status == 'RUNNING'
    assert upload.current_task == 'uploading'

    upload.process_upload()  # pylint: disable=E1101
    upload.block_until_complete(interval=.01)

    return upload


def assert_processing(upload: Upload):
    assert not upload.tasks_running
    assert upload.current_task == 'cleanup'
    assert upload.upload_id is not None
    assert len(upload.errors) == 0
    assert upload.tasks_status == SUCCESS

    upload_files = UploadFiles.get(upload.upload_id, is_authorized=lambda: True)
    assert isinstance(upload_files, StagingUploadFiles)

    for calc in Calc.objects(upload_id=upload.upload_id):
        assert calc.parser is not None
        assert calc.mainfile is not None
        assert calc.tasks_status == SUCCESS

        with upload_files.archive_file(calc.calc_id) as archive_json:
            archive = json.load(archive_json)
        assert 'section_run' in archive
        assert 'section_calculation_info' in archive

        with upload_files.archive_log_file(calc.calc_id) as f:
            assert 'a test' in f.read()
        assert len(calc.errors) == 0

        with upload_files.raw_file(calc.mainfile) as f:
            f.read()

        assert upload_files.metadata.get(calc.calc_id) is not None


def test_processing(processed, no_warn, mails, monkeypatch):
    assert_processing(processed)

    assert len(mails.messages) == 1
    assert re.search(r'Processing completed', mails.messages[0].data.decode('utf-8')) is not None


def test_publish(processed: Upload, no_warn, example_user_metadata, monkeypatch, with_publish_to_coe_repo):
    processed.metadata = example_user_metadata

    n_calcs = processed.total_calcs
    additional_keys = ['with_embargo']
    if with_publish_to_coe_repo:
        additional_keys.append('pid')

    processed.publish_upload()
    try:
        processed.block_until_complete(interval=.01)
    except Exception:
        pass

    assert_coe_upload(processed.upload_id, user_metadata=example_user_metadata)

    assert_upload_files(
        processed.upload_id, PublicUploadFiles, n_calcs, additional_keys, published=True)

    assert_search_upload(processed.upload_id, n_calcs, additional_keys, published=True)


@pytest.mark.timeout(10)
def test_processing_with_warning(proc_infra, test_user, with_warn):
    example_file = 'tests/data/proc/examples_with_warning_template.zip'
    example_upload_id = os.path.basename(example_file).replace('.zip', '')

    upload = run_processing((example_upload_id, example_file), test_user)
    assert_processing(upload)


@pytest.mark.timeout(10)
def test_process_non_existing(proc_infra, test_user, with_error):
    upload = run_processing(('__does_not_exist', '__does_not_exist'), test_user)

    assert not upload.tasks_running
    assert upload.current_task == 'extracting'
    assert upload.tasks_status == FAILURE
    assert len(upload.errors) > 0


@pytest.mark.parametrize('task', ['extracting', 'parse_all', 'cleanup', 'parsing'])
@pytest.mark.timeout(10)
def test_task_failure(monkeypatch, uploaded, task, proc_infra, test_user, with_error):
    # mock the task method to through exceptions
    if hasattr(Upload, task):
        cls = Upload
    elif hasattr(Calc, task):
        cls = Calc
    else:
        assert False

    def mock(self):
        raise Exception('fail for test')
    mock.__name__ = task
    mock = task_decorator(mock)

    monkeypatch.setattr('nomad.processing.data.%s.%s' % (cls.__name__, task), mock)

    # run the test
    upload = run_processing(uploaded, test_user)

    assert not upload.tasks_running

    if task != 'parsing':
        assert upload.tasks_status == FAILURE
        assert upload.current_task == task
        assert len(upload.errors) > 0
    else:
        # there is an empty example with no calcs, even if past parsing_all task
        utils.get_logger(__name__).error('fake')
        if upload.total_calcs > 0:  # pylint: disable=E1101
            assert upload.tasks_status == SUCCESS
            assert upload.current_task == 'cleanup'
            assert len(upload.errors) == 0
            for calc in upload.all_calcs(0, 100):  # pylint: disable=E1101
                assert calc.tasks_status == FAILURE
                assert calc.current_task == 'parsing'
                assert len(calc.errors) > 0

# TODO timeout
# consume_ram, segfault, and exit are not testable with the celery test worker
@pytest.mark.parametrize('failure', ['exception'])
def test_malicious_parser_task_failure(proc_infra, failure, test_user):
    example_file = 'tests/data/proc/chaos_%s.zip' % failure
    example_upload_id = os.path.basename(example_file).replace('.zip', '')

    upload = run_processing((example_upload_id, example_file), test_user)

    assert not upload.tasks_running
    assert upload.current_task == 'cleanup'
    assert len(upload.errors) == 0
    assert upload.tasks_status == SUCCESS

    calcs = Calc.objects(upload_id=upload.upload_id)
    assert calcs.count() == 1
    calc = next(calcs)
    assert not calc.tasks_running
    assert calc.tasks_status == FAILURE
    assert len(calc.errors) == 1
