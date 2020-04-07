# Copyright 2019 Markus Scheidgen
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

''' Methods to help with testing of nomad@FAIRDI.'''

import json
from logging import LogRecord


def assert_log(caplog, level: str, event_part: str) -> LogRecord:
    '''
    Assert whether a log message exists in the logs of the tests at a certain level.

    Parameters
    ----------
    caplog : pytest fixture
        This informs pytest that we want to access the logs from a pytest test.
    level : str
        The level of type of log for which we will search (e.g. 'WARN',
        'ERROR', 'DEBUG').
    event_part : str
        The error message we're after. We search the logs matching level if they
        contain this string.

    '''
    record = None
    for record in caplog.get_records(when='call'):
        if record.levelname == level:
            if (event_part in json.loads(record.msg)['event']):
                record = record
                # No need to look for more matches since we aren't counting matches.
                break
    assert record is not None

    return record
