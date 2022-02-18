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

from nomad import metainfo

from .results import Results


class EntryData(metainfo.MSection):
    '''
    An empty base section definition. This can be used to add new top-level sections
    to an entry.
    '''

    def normalize_results(self, results: Results, logger):
        '''
        Overwrite this to add section specific information to the section results.
        '''
        pass
