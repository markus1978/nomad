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

"""
Processing comprises everything that is necessary to take a file uploaded by a user
and processes it until we have all data necessary for repository, archive, and
potentially further services. This includes storing respective data and information
in the data services (e.g. *minio*, *mongo*, or *elastic*).

A further responsiblity of this module is to provide state information about
running and completed processings. It also needs to provide static information about
the existing processing steps and tasks.

This module does not contain the functions to do the actual work. Those are encapsulated
in :py:mod:`nomad.files`, :py:mod:`nomad.search`, :py:mod:`nomad.users`,
:py:mod:`nomad.parsing`, and :py:mod:`nomad.normalizing`.

Represent processing state
--------------------------

.. figure:: process.png
   :alt: nomad xt processing workflow

   This is the basic workflow of a nomad xt upload processing.


.. autoclass:: ProcPipeline
.. autoclass:: UploadProc
.. autoclass:: CalcProc

Initiate processing
-------------------

.. autofunction:: start_processing
.. autofunction:: handle_uploads
.. autofunction:: handle_uploads_thread

"""

from nomad.processing.app import app
from nomad.processing import tasks
from nomad.processing.state import ProcPipeline, UploadProc, CalcProc
from nomad.processing.handler import handle_uploads, handle_uploads_thread, start_processing