#
# Copyright The NOMAD Authors.
#
# This file is part of NOMAD. See https://nomad-lab.eu for further info.
#
# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at
#
#     http://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.
#

from nomad.datamodel.datamodel import EntryArchive
from typing import Generator, Tuple
import pytest
import os.path
import re
import shutil
import zipfile
import json
import yaml

from nomad import utils, infrastructure, config
from nomad.archive import read_partial_archive_from_mongo
from nomad.files import UploadFiles, StagingUploadFiles, PublicUploadFiles
from nomad.processing import Upload, Entry, ProcessStatus
from nomad.processing.data import UploadContext, generate_entry_id
from nomad.search import search, refresh as search_refresh

from tests.test_search import assert_search_upload
from tests.test_files import assert_upload_files
from tests.utils import ExampleData, create_template_upload_file, set_upload_entry_metadata


def test_generate_entry_id():
    assert generate_entry_id('an_upload_id', 'a/mainfile/path') == 'KUB1stwXd8Ll6lliZnM5OoNZlcaf'


def test_send_mail(mails, monkeypatch):
    infrastructure.send_mail('test name', 'test@email.de', 'test message', 'subject')

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


def run_processing(uploaded: Tuple[str, str], main_author, **kwargs) -> Upload:
    uploaded_id, uploaded_path = uploaded
    upload = Upload.create(
        upload_id=uploaded_id, main_author=main_author, **kwargs)
    assert upload.process_status == ProcessStatus.READY
    assert upload.last_status_message is None
    upload.process_upload(
        file_operation=dict(op='ADD', path=uploaded_path, target_dir='', temporary=kwargs.get('temporary', False)))
    upload.block_until_complete(interval=.01)

    return upload


def assert_processing(upload: Upload, published: bool = False, process='process_upload'):
    assert not upload.process_running
    assert upload.current_process == process
    assert upload.upload_id is not None
    assert len(upload.errors) == 0
    assert upload.process_status == ProcessStatus.SUCCESS

    upload_files = UploadFiles.get(upload.upload_id)
    if published:
        assert isinstance(upload_files, PublicUploadFiles)
    else:
        assert isinstance(upload_files, StagingUploadFiles)

    for entry in Entry.objects(upload_id=upload.upload_id):
        assert entry.parser_name is not None
        assert entry.mainfile is not None
        assert entry.process_status == ProcessStatus.SUCCESS

        with upload_files.read_archive(entry.entry_id) as archive:
            entry_archive = archive[entry.entry_id]
            assert 'run' in entry_archive
            assert 'metadata' in entry_archive
            assert 'processing_logs' in entry_archive

            has_test_event = False
            for log_data in entry_archive['processing_logs']:
                for key in ['event', 'entry_id', 'level']:
                    key in log_data
                has_test_event = has_test_event or log_data['event'] == 'a test log entry'

            assert has_test_event
        assert len(entry.errors) == 0

        archive = read_partial_archive_from_mongo(entry.entry_id)
        assert archive.metadata is not None
        assert archive.workflow[0].calculation_result_ref \
            .system_ref.atoms.labels is not None

        with upload_files.raw_file(entry.mainfile) as f:
            f.read()

        entry_metadata = entry.full_entry_metadata(upload)

        for path in entry_metadata.files:
            with upload_files.raw_file(path) as f:
                f.read()

        # check some (domain) metadata
        assert entry_metadata.quantities
        assert len(entry_metadata.quantities) > 0
        assert len(entry_metadata.processing_errors) == 0

        assert upload.get_entry(entry.entry_id) is not None

        upload_files.close()

    search_results = search(owner=None, query={'upload_id': upload.upload_id})
    assert search_results.pagination.total == Entry.objects(upload_id=upload.upload_id).count()
    for entry in search_results.data:
        assert entry['published'] == published
        assert entry['upload_id'] == upload.upload_id


def assert_user_metadata(entries_metadata, user_metadata):
    for entry_metadata in entries_metadata:
        entry_metadata_dict = entry_metadata.m_to_dict()
        for k, value_expected in user_metadata.items():
            value_actual = entry_metadata_dict[k]
            assert value_actual == value_expected, f'Mismatch {k}: {value_expected} != {value_actual}'


def test_processing(processed, no_warn, mails, monkeypatch):
    assert_processing(processed)

    assert len(mails.messages) == 1
    assert re.search(r'Processing completed', mails.messages[0].data.decode('utf-8')) is not None


def test_processing_two_runs(test_user, proc_infra, tmp):
    upload_file = create_template_upload_file(
        tmp, mainfiles=['tests/data/proc/templates/template_tworuns.json'])
    processed = run_processing(('test_upload_id', upload_file,), test_user)
    assert_processing(processed)


def test_processing_with_large_dir(test_user, proc_infra, tmp):
    upload_path = create_template_upload_file(
        tmp, mainfiles=['tests/data/proc/templates/template.json'], auxfiles=150)
    upload_id = upload_path[:-4]
    upload = run_processing((upload_id, upload_path), test_user)
    for entry in upload.successful_entries:
        assert len(entry.warnings) == 1


def test_publish(non_empty_processed: Upload, no_warn, internal_example_user_metadata, monkeypatch):
    processed = non_empty_processed
    set_upload_entry_metadata(processed, internal_example_user_metadata)

    additional_keys = ['with_embargo']
    metadata_to_check = internal_example_user_metadata.copy()
    metadata_to_check['with_embargo'] = True

    processed.publish_upload(embargo_length=36)
    try:
        processed.block_until_complete(interval=.01)
    except Exception:
        pass

    with processed.entries_metadata() as entries:
        assert_user_metadata(entries, metadata_to_check)
        assert_upload_files(processed.upload_id, entries, PublicUploadFiles, published=True)
        assert_search_upload(entries, additional_keys, published=True)

    assert_processing(Upload.get(processed.upload_id), published=True, process='publish_upload')


def test_publish_directly(non_empty_uploaded, test_user, proc_infra, no_warn, monkeypatch):
    processed = run_processing(non_empty_uploaded, test_user, publish_directly=True)

    with processed.entries_metadata() as entries:
        assert_upload_files(processed.upload_id, entries, PublicUploadFiles, published=True)
        assert_search_upload(entries, [], published=True)

    assert_processing(Upload.get(processed.upload_id), published=True)


def test_republish(non_empty_processed: Upload, no_warn, internal_example_user_metadata, monkeypatch):
    processed = non_empty_processed
    set_upload_entry_metadata(processed, internal_example_user_metadata)

    additional_keys = ['with_embargo']
    metadata_to_check = internal_example_user_metadata.copy()
    metadata_to_check['with_embargo'] = True

    processed.publish_upload(embargo_length=36)
    processed.block_until_complete(interval=.01)
    assert Upload.get('examples_template') is not None

    processed.publish_upload()
    processed.block_until_complete(interval=.01)

    with processed.entries_metadata() as entries:
        assert_user_metadata(entries, metadata_to_check)
        assert_upload_files(processed.upload_id, entries, PublicUploadFiles, published=True)
        assert_search_upload(entries, additional_keys, published=True)


def test_publish_failed(
        non_empty_uploaded: Tuple[str, str], internal_example_user_metadata, test_user,
        monkeypatch, proc_infra):

    mock_failure(Entry, 'parsing', monkeypatch)

    processed = run_processing(non_empty_uploaded, test_user)
    set_upload_entry_metadata(processed, internal_example_user_metadata)

    additional_keys = ['with_embargo']
    metadata_to_check = internal_example_user_metadata.copy()
    metadata_to_check['with_embargo'] = True

    processed.publish_upload(embargo_length=36)
    try:
        processed.block_until_complete(interval=.01)
    except Exception:
        pass

    with processed.entries_metadata() as entries:
        assert_user_metadata(entries, metadata_to_check)
        assert_search_upload(entries, additional_keys, published=True, processed=False)


@pytest.mark.parametrize('kwargs', [
    # pytest.param(
    #     dict(
    #         import_settings=dict(include_archive_files=True, trigger_processing=False),
    #         embargo_length=0),
    #     id='no-processing'),
    pytest.param(
        dict(
            import_settings=dict(include_archive_files=False, trigger_processing=True),
            embargo_length=17),
        id='trigger-processing')])
def test_publish_to_central_nomad(
        proc_infra, monkeypatch, oasis_publishable_upload, test_user, no_warn, kwargs):
    upload_id, suffix = oasis_publishable_upload
    import_settings = kwargs.get('import_settings', {})
    embargo_length = kwargs.get('embargo_length')
    old_upload = Upload.get(upload_id)

    import_settings = config.bundle_import.default_settings.customize(import_settings)
    monkeypatch.setattr('nomad.config.bundle_import.default_settings', import_settings)

    old_upload.publish_externally(embargo_length=embargo_length)
    old_upload.block_until_complete()
    assert_processing(old_upload, old_upload.published, 'publish_externally')
    old_upload = Upload.get(upload_id)
    new_upload = Upload.get(upload_id + suffix)
    new_upload.block_until_complete()
    assert_processing(new_upload, old_upload.published, 'import_bundle')
    assert len(old_upload.successful_entries) == len(new_upload.successful_entries) == 1
    if embargo_length is None:
        embargo_length = old_upload.embargo_length
    old_entry = old_upload.successful_entries[0]
    new_entry = new_upload.successful_entries[0]
    old_entry_metadata_dict = old_entry.full_entry_metadata(old_upload).m_to_dict()
    new_entry_metadata_dict = new_entry.full_entry_metadata(new_upload).m_to_dict()
    for k, v in old_entry_metadata_dict.items():
        if k == 'with_embargo':
            assert new_entry_metadata_dict[k] == (embargo_length > 0)
        elif k not in (
                'upload_id', 'entry_id', 'upload_create_time', 'entry_create_time',
                'last_processing_time', 'publish_time', 'embargo_length',
                'n_quantities', 'quantities'):  # TODO: n_quantities and quantities update problem?
            assert new_entry_metadata_dict[k] == v, f'Metadata not matching: {k}'
    assert new_entry.datasets == ['dataset_id']
    assert old_upload.published_to[0] == config.oasis.central_nomad_deployment_id
    assert new_upload.from_oasis and new_upload.oasis_deployment_id
    assert new_upload.embargo_length == embargo_length
    assert old_upload.upload_files.access == 'restricted' if old_upload.with_embargo else 'public'
    assert new_upload.upload_files.access == 'restricted' if new_upload.with_embargo else 'public'


@pytest.mark.timeout(config.tests.default_timeout)
def test_processing_with_warning(proc_infra, test_user, with_warn, tmp):

    example_file = create_template_upload_file(
        tmp, 'tests/data/proc/templates/with_warning_template.json')
    example_upload_id = os.path.basename(example_file).replace('.zip', '')

    upload = run_processing((example_upload_id, example_file), test_user)
    assert_processing(upload)


@pytest.mark.timeout(config.tests.default_timeout)
def test_process_non_existing(proc_infra, test_user, with_error):
    upload = run_processing(('__does_not_exist', '__does_not_exist'), test_user)

    assert not upload.process_running
    assert upload.process_status == ProcessStatus.FAILURE
    assert len(upload.errors) > 0


@pytest.mark.timeout(config.tests.default_timeout)
@pytest.mark.parametrize('with_failure', [None, 'before', 'after', 'not-matched'])
def test_re_processing(published: Upload, internal_example_user_metadata, monkeypatch, tmp, with_failure):
    if with_failure == 'not-matched':
        monkeypatch.setattr('nomad.config.reprocess.use_original_parser', True)

    if with_failure == 'before':
        entry = published.entries_sublist(0, 1)[0]
        entry.process_status = ProcessStatus.FAILURE
        entry.errors = ['example error']
        entry.save()
        assert published.failed_entries_count > 0

    assert published.published
    assert published.upload_files.to_staging_upload_files() is None

    old_upload_time = published.last_update
    first_entry: Entry = published.entries_sublist(0, 1)[0]
    old_entry_time = first_entry.last_processing_time

    with published.upload_files.read_archive(first_entry.entry_id) as archive:
        archive[first_entry.entry_id]['processing_logs']

    old_archive_files = list(
        archive_file
        for archive_file in os.listdir(published.upload_files.os_path)
        if 'archive' in archive_file)

    metadata_to_check = internal_example_user_metadata.copy()
    metadata_to_check['with_embargo'] = True

    with published.entries_metadata() as entries_generator:
        entries = list(entries_generator)
        assert_user_metadata(entries, metadata_to_check)

    if with_failure != 'not-matched':
        for archive_file in old_archive_files:
            with open(published.upload_files.join_file(archive_file).os_path, 'wt') as f:
                f.write('')

    if with_failure == 'after':
        raw_files = create_template_upload_file(tmp, 'tests/data/proc/templates/unparsable/template.json')
    elif with_failure == 'not-matched':
        monkeypatch.setattr('nomad.parsing.artificial.TemplateParser.is_mainfile', lambda *args, **kwargs: False)
        raw_files = create_template_upload_file(tmp, 'tests/data/proc/templates/different_atoms/template.json')
    else:
        raw_files = create_template_upload_file(tmp, 'tests/data/proc/templates/different_atoms/template.json')

    shutil.copyfile(
        raw_files, published.upload_files.join_file('raw-restricted.plain.zip').os_path)

    # reprocess
    monkeypatch.setattr('nomad.config.meta.version', 're_process_test_version')
    monkeypatch.setattr('nomad.config.meta.commit', 're_process_test_commit')
    published.process_upload()
    try:
        published.block_until_complete(interval=.01)
    except Exception:
        pass

    published.reload()
    first_entry.reload()

    # assert new process time
    if with_failure != 'not-matched':
        assert published.last_update > old_upload_time
        assert first_entry.last_processing_time > old_entry_time

    # assert new process version
    if with_failure != 'not-matched':
        assert first_entry.nomad_version == 're_process_test_version'
        assert first_entry.nomad_commit == 're_process_test_commit'

    # assert changed archive files
    if with_failure == 'after':
        with published.upload_files.read_archive(first_entry.entry_id) as archive_reader:
            assert list(archive_reader[first_entry.entry_id].keys()) == ['processing_logs', 'metadata']
            archive = EntryArchive.m_from_dict(archive_reader[first_entry.entry_id].to_dict())

    else:
        with published.upload_files.read_archive(first_entry.entry_id) as archive_reader:
            assert len(archive_reader[first_entry.entry_id]) > 2  # contains more then logs and metadata
            archive = EntryArchive.m_from_dict(archive_reader[first_entry.entry_id].to_dict())

    # assert maintained user metadata (mongo+es)
    assert_upload_files(published.upload_id, entries, PublicUploadFiles, published=True)
    assert_search_upload(entries, published=True)
    if with_failure not in ['after', 'not-matched']:
        assert_processing(Upload.get(published.upload_id), published=True)

    # assert changed entry data
    if with_failure not in ['after']:
        assert archive.results.material.elements[0] == 'H'
    else:
        assert archive.results is None


@pytest.mark.parametrize('publish,old_staging', [
    (False, False), (True, True), (True, False)])
def test_re_process_staging(non_empty_processed, publish, old_staging):
    upload = non_empty_processed

    if publish:
        upload.publish_upload()
        try:
            upload.block_until_complete(interval=.01)
        except Exception:
            pass

        if old_staging:
            StagingUploadFiles(upload.upload_id, create=True)

    upload.process_upload()
    try:
        upload.block_until_complete(interval=.01)
    except Exception:
        pass

    assert_processing(upload, published=publish)
    if publish:
        with pytest.raises(KeyError):
            StagingUploadFiles(upload.upload_id)
    else:
        StagingUploadFiles(upload.upload_id)


@pytest.mark.parametrize('published', [False, True])
def test_re_process_match(non_empty_processed, published, monkeypatch, no_warn):
    upload: Upload = non_empty_processed

    if published:
        upload.publish_upload(embargo_length=0)
        upload.block_until_complete(interval=.01)

    assert upload.total_entries_count == 1, upload.total_entries_count

    if published:
        import zipfile

        upload_files = UploadFiles.get(upload.upload_id)
        zip_path = upload_files.raw_zip_file_object().os_path
        with zipfile.ZipFile(zip_path, mode='a') as zf:
            zf.write('tests/data/parsers/vasp/vasp.xml', 'vasp.xml')
    else:
        upload_files = UploadFiles.get(upload.upload_id).to_staging_upload_files()
        upload_files.add_rawfiles('tests/data/parsers/vasp/vasp.xml')

    upload.process_upload()
    upload.block_until_complete(interval=.01)

    assert upload.total_entries_count == 2
    if not published:
        assert upload.published == published
        assert not upload.with_embargo


@pytest.mark.parametrize('args', [
    pytest.param(
        dict(
            add=['new_folder/new_sub_folder'],
            path_filter='new_folder/new_sub_folder/template.json',
            expected_result={
                'examples_template/template.json': False,
                'new_folder/new_sub_folder/template.json': True}),
        id='add-one-filter-file'),
    pytest.param(
        dict(
            add=['new_folder/new_sub_folder'],
            path_filter='new_folder/new_sub_folder',
            expected_result={
                'examples_template/template.json': False,
                'new_folder/new_sub_folder/template.json': True}),
        id='add-one-filter-folder'),
    pytest.param(
        dict(
            add=['new_folder/new_sub_folder1', 'new_folder/new_sub_folder2'],
            path_filter='new_folder',
            expected_result={
                'examples_template/template.json': False,
                'new_folder/new_sub_folder1/template.json': True,
                'new_folder/new_sub_folder2/template.json': True}),
        id='add-two'),
    pytest.param(
        dict(
            add=['examples_template/new_sub_folder'],
            path_filter='examples_template/new_sub_folder',
            expected_result={
                'examples_template/template.json': True,
                'examples_template/new_sub_folder/template.json': True}),
        id='add-to-existing-entry-folder'),
    pytest.param(
        dict(
            add=['examples_template/new_sub_folder'],
            remove=['examples_template/template.json'],
            path_filter='examples_template',
            expected_result={
                'examples_template/new_sub_folder/template.json': True}),
        id='add-and-remove'),
    pytest.param(
        dict(
            add=['new_folder/new_sub_folder'],
            path_filter='examples_template',
            expected_result={
                'examples_template/template.json': True}),
        id='add-one-filter-other'),
    pytest.param(
        dict(
            remove=['examples_template/template.json'],
            path_filter='examples_template',
            expected_result={}),
        id='remove-everything')])
def test_process_partial(proc_infra, non_empty_processed: Upload, args):
    add = args.get('add', [])
    remove = args.get('remove', [])
    path_filter = args['path_filter']
    expected_result = args['expected_result']
    old_timestamps = {e.mainfile: e.complete_time for e in non_empty_processed.successful_entries}
    upload_files: StagingUploadFiles = non_empty_processed.upload_files  # type: ignore
    for path in add:
        upload_files.add_rawfiles('tests/data/proc/templates/template.json', path)
    for path in remove:
        upload_files.delete_rawfiles(path)
    non_empty_processed.process_upload(path_filter=path_filter)
    non_empty_processed.block_until_complete()
    search_refresh()  # Process does not wait for search index to be refreshed when deleting
    assert_processing(non_empty_processed)
    new_timestamps = {e.mainfile: e.complete_time for e in non_empty_processed.successful_entries}
    assert new_timestamps.keys() == expected_result.keys()
    for key, expect_updated in expected_result.items():
        if expect_updated:
            assert key not in old_timestamps or old_timestamps[key] < new_timestamps[key]


def test_re_pack(published: Upload):
    upload_id = published.upload_id
    upload_files: PublicUploadFiles = published.upload_files  # type: ignore
    assert upload_files.access == 'restricted'
    assert published.with_embargo

    # Lift embargo
    published.embargo_length = 0
    published.save()
    upload_files.re_pack(with_embargo=False)

    assert upload_files.access == 'public'
    for path_info in upload_files.raw_directory_list(recursive=True, files_only=True):
        with upload_files.raw_file(path_info.path) as f:
            f.read()

    for entry in Entry.objects(upload_id=upload_id):
        with upload_files.read_archive(entry.entry_id) as archive:
            archive[entry.entry_id].to_dict()

    published.reload()


def mock_failure(cls, function_name, monkeypatch):
    def mock(self, *args, **kwargs):
        raise Exception('fail for test')

    mock.__name__ = function_name

    monkeypatch.setattr('nomad.processing.data.%s.%s' % (cls.__name__, function_name), mock)


@pytest.mark.parametrize('function', ['update_files', 'match_all', 'cleanup', 'parsing'])
@pytest.mark.timeout(config.tests.default_timeout)
def test_process_failure(monkeypatch, uploaded, function, proc_infra, test_user, with_error):
    upload_id, _ = uploaded
    # mock the function to throw exceptions
    if hasattr(Upload, function):
        cls = Upload
    elif hasattr(Entry, function):
        cls = Entry
    else:
        assert False

    mock_failure(cls, function, monkeypatch)

    # run the test
    upload = run_processing(uploaded, test_user)

    assert not upload.process_running

    if function != 'parsing':
        assert upload.process_status == ProcessStatus.FAILURE
        assert len(upload.errors) > 0
    else:
        # there is an empty example with no entries, even if past parsing_all step
        utils.get_logger(__name__).error('fake')
        if upload.total_entries_count > 0:  # pylint: disable=E1101
            assert upload.process_status == ProcessStatus.SUCCESS
            assert len(upload.errors) == 0
            for entry in upload.entries_sublist(0, 100):  # pylint: disable=E1101
                assert entry.process_status == ProcessStatus.FAILURE
                assert len(entry.errors) > 0

    entry = Entry.objects(upload_id=upload_id).first()
    if entry is not None:
        with upload.upload_files.read_archive(entry.entry_id) as archive:
            entry_archive = archive[entry.entry_id]
            assert 'metadata' in entry_archive
            if function != 'cleanup':
                assert len(entry_archive['metadata']['processing_errors']) > 0
            assert 'processing_logs' in entry_archive
            if function != 'parsing':
                assert 'run' in entry_archive


# consume_ram, segfault, and exit are not testable with the celery test worker
@pytest.mark.parametrize('failure', ['exception'])
def test_malicious_parser_failure(proc_infra, failure, test_user, tmp):
    example_file = os.path.join(tmp, 'upload.zip')
    with zipfile.ZipFile(example_file, mode='w') as zf:
        with zf.open('chaos.json', 'w') as f:
            f.write(f'"{failure}"'.encode())
    example_upload_id = f'chaos_{failure}'

    upload = run_processing((example_upload_id, example_file), test_user)

    assert not upload.process_running
    assert len(upload.errors) == 0
    assert upload.process_status == ProcessStatus.SUCCESS

    entries = Entry.objects(upload_id=upload.upload_id)
    assert entries.count() == 1
    entry = next(entries)
    assert not entry.process_running
    assert entry.process_status == ProcessStatus.FAILURE
    assert len(entry.errors) == 1


@pytest.mark.timeout(config.tests.default_timeout)
def test_ems_data(proc_infra, test_user):
    upload = run_processing(('test_ems_upload', 'tests/data/proc/examples_ems.zip'), test_user)

    additional_keys = ['results.method.method_name', 'results.material.elements']
    assert upload.total_entries_count == 1
    assert len(upload.successful_entries) == 1

    with upload.entries_metadata() as entries:
        assert_upload_files(upload.upload_id, entries, StagingUploadFiles, published=False)
        assert_search_upload(entries, additional_keys, published=False)


@pytest.mark.timeout(config.tests.default_timeout)
def test_qcms_data(proc_infra, test_user):
    upload = run_processing(('test_qcms_upload', 'tests/data/proc/examples_qcms.zip'), test_user)

    additional_keys = ['results.method.simulation.program_name', 'results.material.elements']
    assert upload.total_entries_count == 1
    assert len(upload.successful_entries) == 1

    with upload.entries_metadata() as entries:
        assert_upload_files(upload.upload_id, entries, StagingUploadFiles, published=False)
        assert_search_upload(entries, additional_keys, published=False)


@pytest.mark.timeout(config.tests.default_timeout)
def test_phonopy_data(proc_infra, test_user):
    upload = run_processing(('test_upload', 'tests/data/proc/examples_phonopy.zip'), test_user)

    additional_keys = ['results.method.simulation.program_name']
    assert upload.total_entries_count == 2
    assert len(upload.successful_entries) == 2

    with upload.entries_metadata() as entries:
        assert_upload_files(upload.upload_id, entries, StagingUploadFiles, published=False)
        assert_search_upload(entries, additional_keys, published=False)


def test_read_metadata_from_file(proc_infra, test_user, other_test_user, tmp):
    upload_file = os.path.join(tmp, 'upload.zip')
    with zipfile.ZipFile(upload_file, 'w') as zf:
        zf.write('tests/data/proc/templates/template.json', 'examples/entry_1/template.json')
        zf.write('tests/data/proc/templates/template.json', 'examples/entry_2/template.json')
        zf.write('tests/data/proc/templates/template.json', 'examples/entry_3/template.json')
        zf.write('tests/data/proc/templates/template.json', 'examples/template.json')
        entry_1 = dict(
            comment='Entry 1 of 3',
            references='http://test1.com',
            external_id='external_id_1')
        with zf.open('examples/entry_1/nomad.yaml', 'w') as f: f.write(yaml.dump(entry_1).encode())
        entry_2 = dict(
            comment='Entry 2 of 3',
            references=['http://test2.com'],
            external_id='external_id_2')
        with zf.open('examples/entry_2/nomad.json', 'w') as f: f.write(json.dumps(entry_2).encode())
        metadata = {
            'upload_name': 'my name',
            'coauthors': other_test_user.user_id,
            'references': ['http://test0.com'],
            'entries': {
                'examples/entry_3/template.json': {
                    'comment': 'Entry 3 of 3',
                    'references': 'http://test3.com',
                    'external_id': 'external_id_3'
                },
                'examples/entry_1/template.json': {
                    'comment': 'root entries comment 1'
                }
            }
        }
        with zf.open('nomad.json', 'w') as f: f.write(json.dumps(metadata).encode())

    upload = run_processing(('test_upload', upload_file), test_user)

    entries = Entry.objects(upload_id=upload.upload_id)
    entries = sorted(entries, key=lambda entry: entry.mainfile)

    comment = ['root entries comment 1', 'Entry 2 of 3', 'Entry 3 of 3', None]
    external_ids = ['external_id_1', 'external_id_2', 'external_id_3', None]
    references = [['http://test1.com'], ['http://test2.com'], ['http://test3.com'], ['http://test0.com']]
    expected_coauthors = [other_test_user]

    for i in range(len(entries)):
        entry_metadata = entries[i].full_entry_metadata(upload)
        assert entry_metadata.comment == comment[i]
        assert entry_metadata.references == references[i]
        assert entry_metadata.external_id == external_ids[i]
        coauthors = [a.m_proxy_resolve() for a in entry_metadata.coauthors]
        assert len(coauthors) == len(expected_coauthors)
        for j in range(len(coauthors)):
            assert coauthors[j].user_id == expected_coauthors[j].user_id
            assert coauthors[j].username == expected_coauthors[j].username
            assert coauthors[j].email == expected_coauthors[j].email
            assert coauthors[j].first_name == expected_coauthors[j].first_name
            assert coauthors[j].last_name == expected_coauthors[j].last_name


def test_skip_matching(proc_infra, test_user):
    upload = run_processing(('test_skip_matching', 'tests/data/proc/skip_matching.zip'), test_user)
    assert upload.total_entries_count == 1


@pytest.mark.parametrize('url,normalized_url', [
    pytest.param('../upload/archive/test_id#/run/0/method/0', None, id='entry-id'),
    pytest.param('../upload/archive/mainfile/my/test/file#/run/0/method/0', '../upload/archive/test_id#/run/0/method/0', id='mainfile')])
def test_upload_context(raw_files, mongo, test_user, url, normalized_url, monkeypatch):
    monkeypatch.setattr(
        'nomad.processing.data.UploadContext._resolve_mainfile',
        lambda *args, **kwargs: 'test_id')

    from nomad.datamodel.metainfo import simulation

    data = ExampleData(main_author=test_user)
    data.create_upload(upload_id='test_id', published=True)

    referenced_archive = EntryArchive()
    referenced_archive.run.append(simulation.Run())
    referenced_archive.run[0].method.append(simulation.method.Method())
    data.create_entry(
        upload_id='test_id', entry_id='test_id', mainfile='my/test/file',
        entry_archive=referenced_archive)

    data.save(with_es=False)

    upload = Upload.objects(upload_id='test_id').first()
    assert upload is not None

    context = UploadContext(upload)
    test_archive = EntryArchive(m_context=context)

    test_archive.run.append(simulation.Run())
    calculation = simulation.calculation.Calculation()
    test_archive.run[0].calculation.append(calculation)

    assert calculation.m_root().m_context is not None
    calculation.method_ref = url
    assert calculation.m_to_dict()['method_ref'] == normalized_url if normalized_url else url
    assert calculation.method_ref.m_root().metadata.entry_id == 'test_id'
