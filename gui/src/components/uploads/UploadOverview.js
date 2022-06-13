/*
 * Copyright The NOMAD Authors.
 *
 * This file is part of NOMAD. See https://nomad-lab.eu for further info.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
import React, { useEffect, useState } from 'react'
import PropTypes from 'prop-types'
import { makeStyles, Step, StepContent, StepLabel, Stepper, Typography, Link, Button,
  TextField, Tooltip, Box, Grid, FormControl, InputLabel, Select, MenuItem, FormHelperText,
  Input, DialogTitle, DialogContent, Dialog, LinearProgress, IconButton, Accordion, AccordionSummary, AccordionDetails} from '@material-ui/core'
import Dropzone from 'react-dropzone'
import UploadIcon from '@material-ui/icons/CloudUpload'
import ExpandMoreIcon from '@material-ui/icons/ExpandMore'
import { appBase, oasis } from '../../config'
import { CodeList } from '../About'
import FilesBrower from './FilesBrowser'
import { useErrors } from '../errors'
import ProcessingTable from './ProcessingTable'
import DownloadIcon from '@material-ui/icons/CloudDownload'
import EditIcon from '@material-ui/icons/Edit'
import DeleteIcon from '@material-ui/icons/Delete'
import ReprocessIcon from '@material-ui/icons/Autorenew'
import WithButton from '../utils/WithButton'
import PublishedIcon from '@material-ui/icons/Public'
import UnPublishedIcon from '@material-ui/icons/AccountCircle'
import Markdown from '../Markdown'
import EditMembersDialog from './EditMembersDialog'
import EditMetaDataDialog from './EditMetaDataDialog'
import Page from '../Page'
import { combinePagination } from '../datatable/Datatable'
import Download from '../entry/Download'
import DialogContentText from '@material-ui/core/DialogContentText'
import DialogActions from '@material-ui/core/DialogActions'
import { SourceApiCall, SourceApiDialogButton } from '../buttons/SourceDialogButton'
import CreateEntry from './CreateEntry'
import { useDataStore } from '../DataStore'
import { useUploadContext } from './UploadContext'
import { useApi } from '../api'
import ReloadIcon from '@material-ui/icons/Replay'

const useDropButtonStyles = makeStyles(theme => ({
  dropzone: {
    width: '100%'
  },
  dropzoneAccept: {
    '& button': {
      background: theme.palette.primary.main,
      color: theme.palette.common.white
    }
  },
  dropzoneReject: {
    '& button': {
      background: theme.palette.error.main,
      color: theme.palette.common.white
    }
  }
}))

function DropButton({onDrop, ...buttonProps}) {
  const classes = useDropButtonStyles()
  return <Dropzone
    className={classes.dropzone}
    activeClassName={classes.dropzoneAccept}
    rejectClassName={classes.dropzoneReject}
    onDrop={onDrop}
  >
    <Button
      variant="contained"
      color="default"
      startIcon={<UploadIcon/>}
      {...buttonProps}
    >
      click or drop files
    </Button>
  </Dropzone>
}
DropButton.propTypes = {
  onDrop: PropTypes.func
}

function UploadStatus({upload, ...props}) {
  if (!upload) {
    return <UnPublishedIcon color="default" {...props} />
  }
  if (upload.published) {
    return <Tooltip title="This upload is published and visible to everybody.">
      <PublishedIcon color="primary" {...props} />
    </Tooltip>
  }
  // TODO published with embargo
  if (!upload.published) {
    return <Tooltip title="This upload is not yet published and only visible to you.">
      <UnPublishedIcon color="error" {...props} />
    </Tooltip>
  }
}
UploadStatus.propTypes = {
  upload: PropTypes.object
}

const useUploadNameStyles = makeStyles(theme => ({
  edit: {
    display: 'flex',
    alignItems: 'center',
    '& button': {
      marginLeft: theme.spacing(2)
    }
  }
}))

function UploadName({upload_name, onChange}) {
  const [edit, setEdit] = useState(false)
  const [value, setValue] = useState(null)
  const classes = useUploadNameStyles()

  const handleSave = () => {
    setEdit(false)
    if (onChange) {
      onChange(value)
    }
  }

  if (edit) {
    return <div className={classes.edit}>
      <TextField value={value} onChange={event => setValue(event.target.value)} fullWidth />
      <Button size="small" variant="contained" onClick={handleSave}>save</Button>
    </div>
  }

  return <WithButton size="small"
    icon={<EditIcon style={{fontSize: 24}} />} onClick={() => { setEdit(true); setValue(upload_name) }}
  >
    <Typography variant="h6">
      {upload_name || <i>unnamed upload</i>}
    </Typography>
  </WithButton>
}
UploadName.propTypes = {
  upload_name: PropTypes.string,
  onChange: PropTypes.func
}

function PublishUpload({upload, onPublish}) {
  const [embargo, setEmbargo] = useState(upload.embargo_length === undefined ? 0 : upload.embargo_length)
  const [openConfirmDialog, setOpenConfirmDialog] = useState(false)
  const handlePublish = () => {
    setOpenConfirmDialog(false)
    onPublish({embargo_length: embargo})
  }

  if (upload.published) {
    return <Markdown>{`
      This upload has already been published.
    `}</Markdown>
  }

  const buttonLabel = embargo > 0 ? 'Publish with embargo' : 'Publish'

  return <React.Fragment>
    <Dialog
      open={openConfirmDialog}
      onClose={() => setOpenConfirmDialog(false)}
    >
      <DialogTitle>Confirm that you want to publish the upload</DialogTitle>
      <DialogContent>
        <DialogContentText>
          You are about the publish this upload. The upload cannot be removed and
          the files and entries in this upload cannot be changed after publication.
        </DialogContentText>
      </DialogContent>
      <DialogActions>
        <Button onClick={() => setOpenConfirmDialog(false)} autoFocus>Cancel</Button>
        <Button onClick={handlePublish}>{buttonLabel}</Button>
      </DialogActions>
    </Dialog>
    <Markdown>{`
      If you agree this upload will be published and move out of your private staging
      area into the public NOMAD. This step is final. All public data will be made available under the Creative
      Commons Attribution license ([CC BY 4.0](https://creativecommons.org/licenses/by/4.0/)).

      If you wish, you can put an embargo on your data. This makes some metadata (e.g.
      chemical formula, system type, spacegroup, etc.) public, but the raw-file
      and archive contents remain hidden (except to you, and users you explicitly
      share the data with).
      You can already create datasets and assign DOIs for data with embargo, e.g.
      to put it into your unpublished paper.
      The embargo will last up to 36 month. Afterwards, your data will be made publicly
      available. You can also lift the embargo sooner if you wish.
    `}</Markdown>
    <Box marginTop={2}>
      <Grid container direction="row" spacing={2}>
        <Grid item style={{width: 300}}>
          <FormControl style={{width: '100%'}}>
            <InputLabel shrink htmlFor="embargo-label-placeholder">
              Embargo period
            </InputLabel>
            <Select
              value={embargo}
              onChange={event => setEmbargo(event.target.value)}
              input={<Input name="embargo" id="embargo-label-placeholder" />}
              displayEmpty
              name="embargo"
              // className={classes.selectEmpty}
            >
              <MenuItem value={0}>
                <em>No embargo</em>
              </MenuItem>
              <MenuItem value={3}>3</MenuItem>
              <MenuItem value={6}>6</MenuItem>
              <MenuItem value={12}>12</MenuItem>
              <MenuItem value={24}>24</MenuItem>
              <MenuItem value={36}>36</MenuItem>
            </Select>
            <FormHelperText>{embargo > 0 ? 'months before the data becomes public' : 'publish without embargo'}</FormHelperText>
          </FormControl>
        </Grid>
        <Grid item>
          <Box marginTop={2} >
            <Button
              style={{height: 32, minWith: 100}}
              size="small" variant="contained"
              onClick={() => setOpenConfirmDialog(true)} color="primary"
              disabled={upload.process_running}
              data-testid='publish-upload-button'
            >
              {buttonLabel}
            </Button>
          </Box>
        </Grid>
      </Grid>
    </Box>
  </React.Fragment>
}
PublishUpload.propTypes = {
  upload: PropTypes.object,
  onPublish: PropTypes.func
}

function LinearProgressWithLabel(props) {
  return (
    <Box display="flex" alignItems="center">
      <Box width="100%" mr={1}>
        <LinearProgress variant="determinate" {...props} />
      </Box>
      <Typography variant="body2" color="textSecondary">{`${Math.round(
        props.value
      )}%`}</Typography>
    </Box>
  )
}
LinearProgressWithLabel.propTypes = {
  value: PropTypes.number.isRequired
}

function ProcessingStatus({data}) {
  const {pagination, upload, processing_successful, processing_failed} = data
  let mainMessage = null
  if (upload.process_running) {
    mainMessage = 'Processing ...'
  } else {
    if (upload.process_status === 'SUCCESS') {
      mainMessage = 'Processing completed'
    } else if (upload.process_status === 'FAILURE') {
      mainMessage = 'Processing failed ' + upload.errors.join(', ')
    } else {
      mainMessage = 'Waiting for processing ...'
    }
  }
  return <Box marginTop={1} marginBottom={2}>
    <Typography>
      {mainMessage}, {processing_successful}/{pagination?.total} entries processed{(processing_failed > 0) && `, ${processing_failed} failed`}
    </Typography>
  </Box>
}
ProcessingStatus.propTypes = {
  data: PropTypes.object
}

const useStyles = makeStyles(theme => ({
  stepper: {
    backgroundColor: 'inherit',
    paddingLeft: 0,
    paddingRight: 0
  },
  stepContent: {
    marginBottom: theme.spacing(2)
  }
}))

function UploadOverview(props) {
  const classes = useStyles()
  const {api} = useApi()
  const {raiseError} = useErrors()
  const dataStore = useDataStore()
  const {
    uploadId, upload, entries, apiData, hasUpload, isProcessing, error,
    isWriter, pagination, deleteRequested} = useUploadContext()
  const [uploading, setUploading] = useState(null)
  const [openDeleteConfirmDialog, setOpenDeleteConfirmDialog] = useState(false)
  const [openEmbargoConfirmDialog, setOpenEmbargoConfirmDialog] = useState(false)
  const [readme, setReadme] = useState(null)

  useEffect(() => {
    if (uploading) return

    api.get(`/uploads/${uploadId}/raw/README.md`)
      .then(setReadme)
      .catch(error => {
        setReadme(null)
        if (error.name !== 'DoesNotExist') {
          raiseError(error)
        }
      })
  }, [api, raiseError, uploadId, uploading, setReadme])

  const handleDrop = (files) => {
    if (!files[0]?.name) {
      return // Not dropping a file, but something else. Ignore.
    }
    const formData = new FormData() // eslint-disable-line no-undef
    for (const file of files) {
      formData.append('file', file)
    }
    setUploading(0)
    api.put(`/uploads/${uploadId}/raw/`, formData, {
      onUploadProgress: (progressEvent) => {
        const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total)
        setUploading(percentCompleted)
      }
    })
      .then(results => dataStore.updateUpload(uploadId, {upload: results.data}))
      .catch(raiseError)
      .finally(() => {
        setUploading(null)
      })
  }

  const handleNameChange = (upload_name) => {
    api.post(`/uploads/${uploadId}/edit`, {metadata: {upload_name: upload_name}})
      .then(dataStore.requestRefreshUpload(uploadId))
      .catch(raiseError)
  }

  const handlePublish = ({embargo_length}) => {
    api.post(`/uploads/${uploadId}/action/publish?embargo_length=${embargo_length}`)
      .then(results => dataStore.updateUpload(uploadId, {upload: results.data}))
      .catch(raiseError)
  }

  const handleLiftEmbargo = () => {
    setOpenEmbargoConfirmDialog(false)
    api.post(`/uploads/${uploadId}/edit`, {metadata: {embargo_length: 0}})
      .then(dataStore.requestRefreshUpload(uploadId))
      .catch(raiseError)
  }

  const handleReload = () => {
    dataStore.requestRefreshUpload(uploadId)
  }

  const handleReprocess = () => {
    api.post(`/uploads/${uploadId}/action/process`)
      .then(results => dataStore.updateUpload(uploadId, {upload: results.data}))
      .catch(raiseError)
  }

  const handleDelete = () => {
    setOpenDeleteConfirmDialog(false)
    api.delete(`/uploads/${uploadId}`)
      .then(results => dataStore.updateUpload(uploadId, {upload: results.data, deletionRequested: true}))
      .catch(raiseError)
  }

  if (!hasUpload || !entries) {
    return <Page limitedWidth>
      {(error ? <Typography>{error.apiMessage || error.message || 'Failed to load'}</Typography> : <Typography>loading ...</Typography>)}
    </Page>
  }

  const isAuthenticated = api.keycloak.authenticated
  const isPublished = upload.published
  const isEmpty = upload.entries === 0

  const handleDeleteButtonClicked = () => {
    if (isEmpty) {
      handleDelete()
    } else {
      setOpenDeleteConfirmDialog(true)
    }
  }

  return (
    <Page limitedWidth>
      {(uploading || uploading === 0) && <Dialog open>
        <DialogTitle>Uploading file ...</DialogTitle>
        <DialogContent>
          <Box width={300}>
            <LinearProgressWithLabel value={uploading} />
          </Box>
        </DialogContent>
      </Dialog>}
      <Grid container spacing={2} alignItems="center">
        <Grid item>
          <UploadStatus upload={upload} fontSize="large" />
        </Grid>
        <Grid item style={{flexGrow: 1}}>
          <UploadName upload_name={upload?.upload_name} onChange={handleNameChange} />
          <WithButton clipboard={uploadId}>
            <Typography>upload id: {uploadId}</Typography>
          </WithButton>
        </Grid>
        <Grid>
          <EditMembersDialog disabled={!isWriter}/>
          <Download
            component={IconButton} tooltip="Download files"
            url={`uploads/${uploadId}/raw/?compress=true`}
            data-testid='upload-download-action'
          >
            <DownloadIcon />
          </Download>
          <IconButton onClick={handleReload}>
            <Tooltip title="Reload">
              <ReloadIcon />
            </Tooltip>
          </IconButton>
          <IconButton disabled={isPublished || !isWriter} onClick={handleReprocess} data-testid='upload-reprocess-action'>
            <Tooltip title="Reprocess">
              <ReprocessIcon />
            </Tooltip>
          </IconButton>
          <SourceApiDialogButton maxWidth="lg" fullWidth>
            <SourceApiCall {...apiData} />
          </SourceApiDialogButton>
          <IconButton disabled={isPublished || !isWriter} onClick={handleDeleteButtonClicked} data-testid='upload-delete-action'>
            <Tooltip title="Delete the upload">
              <DeleteIcon />
            </Tooltip>
          </IconButton>
          <Dialog
            open={openDeleteConfirmDialog}
            aria-describedby="alert-dialog-description"
          >
            <DialogContent>
              <DialogContentText id="alert-dialog-description">
                The upload is not empty. Are you sure you want to delete this upload?
              </DialogContentText>
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setOpenDeleteConfirmDialog(false)} autoFocus>Cancel</Button>
              <Button onClick={handleDelete}>Delete</Button>
            </DialogActions>
          </Dialog>
        </Grid>
      </Grid>
      {readme && (
        <Box marginLeft={4} marginTop={2} marginBottom={0} marginRight={1}>
          <Accordion defaultExpanded>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              README.md
            </AccordionSummary>
            <AccordionDetails>
              <Markdown>{readme}</Markdown>
            </AccordionDetails>
          </Accordion>
        </Box>
      )}
      <Stepper classes={{root: classes.stepper}} orientation="vertical" >
        <Step expanded active={false}>
          <StepLabel>Prepare and upload your files</StepLabel>
          <StepContent>
            {isPublished && <Typography className={classes.stepContent}>
              This upload is published and it&apos;s files can&apos;t be modified anymore.
            </Typography>}
            {!isPublished && (
              <React.Fragment>
                <Typography className={classes.stepContent}>
                  To prepare your data, simply use <b>zip</b> or <b>tar</b> to create a single file that contains
                  all your files as they are. These .zip/.tar files can contain subdirectories and additional files.
                  NOMAD will search through all files and identify the relevant files automatically.
                  Each uploaded file can be <b>up to 32GB</b> in size, you can have <b>up to 10 unpublished
                  uploads</b> simultaneously. Your uploaded data is not published right away.
                  Find more details about uploading data in our <Link href={`${appBase}/docs/upload.html`}>documentation</Link> or visit
                  our <Link href="https://nomad-lab.eu/repository-archive-faqs">FAQs</Link>.
                  The following codes are supported: <CodeList withUploadInstructions />. Click
                  the code to get more specific information about how to prepare your files.
                </Typography>
                <DropButton
                  className={classes.stepContent}
                  size="large"
                  fullWidth onDrop={handleDrop}
                  disabled={isProcessing} />
              </React.Fragment>
            )}
            <div className={classes.stepContent}>
              <FilesBrower uploadId={uploadId} disabled={isProcessing || deleteRequested} />
            </div>
            {(isAuthenticated && isWriter) && <React.Fragment>
              <Typography className={classes.stepContent}>
                Or, create and edit entries manually.
              </Typography>
              <CreateEntry />
            </React.Fragment>}
          </StepContent>
        </Step>
        <Step expanded={!isEmpty} active={false}>
          <StepLabel>Process data</StepLabel>
          <StepContent>
            <ProcessingStatus data={apiData.response} />
            <ProcessingTable
              data={entries.map(entry => ({...entry.entry_metadata, ...entry}))}
              pagination={combinePagination(pagination, apiData.response?.pagination)}
              customTitle='entry'
              onPaginationChanged={newPagination => dataStore.updateUpload(uploadId, {pagination: newPagination})}/>
          </StepContent>
        </Step>
        {(isAuthenticated && isWriter) && <Step expanded={!isEmpty} active={false}>
          <StepLabel>Edit author metadata</StepLabel>
          <StepContent>
            <Typography className={classes.stepContent}>
              You can add more information about your data, like <i>comments</i>, <i>references</i> (e.g. links
              to publications), you can create <i>datasets</i> from your entries, or <i>share</i> private data
              with others (e.g. before publishing or after publishing with an embargo.).
              Please note that <b>we require you to list the <i>co-authors</i></b> before publishing.
            </Typography>
            <Typography className={classes.stepContent}>
              You can either select and edit individual entries from the list above, or
              edit all entries at once.
            </Typography>
            {!isEmpty && <EditMetaDataDialog selectedEntries={{'upload_id': upload.upload_id}}/>}
          </StepContent>
        </Step>}
        {(isAuthenticated && isWriter) && <Step expanded={!isEmpty} active={false}>
          <StepLabel>Publish</StepLabel>
          <StepContent>
            {isPublished && <Typography className={classes.stepContent}>
              {upload?.with_embargo ? `This upload has been published under embargo with a period of ${upload?.embargo_length} months from ${new Date(upload?.publish_time).toLocaleString()}.`
                : `This upload has already been published.`}
            </Typography>}
            {!isPublished && <PublishUpload upload={upload} onPublish={handlePublish} />}
            {isPublished && upload?.with_embargo && upload?.embargo_length > 0 &&
              <Button onClick={() => setOpenEmbargoConfirmDialog(true)} variant='contained' color='primary' disabled={isProcessing}>
                Lift Embargo
              </Button>}
            <Dialog
              open={openEmbargoConfirmDialog}
              aria-describedby="alert-dialog-description"
            >
              <DialogContent>
                <DialogContentText id="alert-dialog-description">
                  You are about lifting the embargo. The data will be publicly accessible.
                </DialogContentText>
              </DialogContent>
              <DialogActions>
                <Button onClick={() => setOpenEmbargoConfirmDialog(false)} autoFocus>Cancel</Button>
                <Button onClick={handleLiftEmbargo}>Lift Embargo</Button>
              </DialogActions>
            </Dialog>
            {oasis && (
              <Box marginTop={2}>
                <Typography>
                  In future versions of NOMAD, you will be able to create a readonly archived
                  version of your upload, make it available throughout this Oasis, and publish
                  the data or metadata to the <Link href="https://nomad-lab.eu">central NOMAD services</Link>.
                </Typography>
              </Box>
            )}
          </StepContent>
        </Step>}
      </Stepper>
    </Page>
  )
}

export default UploadOverview
