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
import React, { useState, useRef, useCallback, useEffect, useLayoutEffect} from 'react'
import PropTypes from 'prop-types'
import { Typography, makeStyles, Button, Box } from '@material-ui/core'
import { useErrors } from '../errors'
import ReactJson from 'react-json-view'
import { Document, Page, pdfjs } from 'react-pdf'
import InfiniteScroll from 'react-infinite-scroller'
import { useApi } from '../api'
import { apiBase } from '../../config'

pdfjs.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.js`

const useFilePreviewStyles = makeStyles(theme => ({
  scrollableContainer: {
    border: '1px solid black',
    boxSizing: 'border-box',
    width: '100%',
    height: '100%',
    display: 'inline-block',
    overflow: 'auto'
  },
  imgDiv: {
    width: '100%',
    height: '100%',
    position: 'relative'
  },
  imgElement: {
    maxWidth: '100%',
    maxHeight: '100%',
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    margin: 'auto'
  }
}))

/* Viewer definitions */
const viewerText = {
  name: 'text',
  fileExtensions: ['txt', 'yaml', 'yml'],
  maxSizePreview: 1e10, // Effectively infinite
  maxSizeAutoPreview: 10e6,
  render: ({uploadId, path}) => {
    return <FilePreviewText uploadId={uploadId} path={path}/>
  }
}
const viewerImg = {
  name: 'image',
  fileExtensions: ['png', 'jpg', 'jpeg', 'gif', 'bmp', 'svg'],
  maxSizeAutoPreview: 10e6,
  requiresUrlWithAuth: true,
  render: ({classes, url, setFailedToPreview}) => {
    return <div className={classes.imgDiv}>
      <img src={url} className={classes.imgElement} alt="Loading..." onError={() => setFailedToPreview(true)}/>
    </div>
  }
}
const viewerJSON = {
  name: 'json',
  fileExtensions: ['json'],
  maxSizeAutoPreview: 10e6,
  requiresLoadedData: true,
  render: ({classes, data}) => {
    if (typeof data.current === 'string') {
      data.current = JSON.parse(data.current)
    }
    return (
      <Box className={classes.scrollableContainer}>
        <ReactJson src={data.current} enableClipboard={false} collapsed={1} displayObjectSize={false}/>
      </Box>
    )
  }
}
const viewerPDF = {
  name: 'pdf',
  fileExtensions: ['pdf'],
  maxSizeAutoPreview: 10e6,
  requiresUrlWithAuth: true,
  render: ({url, setFailedToPreview}) => {
    return <FilePreviewPdf
      file={{url: url}}
      error={(error) => {
        console.log(error)
        setFailedToPreview(true)
      }}
    />
  }
}
const viewers = [viewerText, viewerImg, viewerJSON, viewerPDF]

const FilePreview = React.memo(({uploadId, path, size}) => {
  const classes = useFilePreviewStyles()
  const {api, user} = useApi()
  const {raiseError} = useErrors()

  // Determine viewer to use and if we should preview automatically, based on extension and size
  const fileExtension = path.split('.').pop().toLowerCase()
  let autoPreview = false
  let selectedViewer = viewerText
  for (const viewer of viewers) {
    if (viewer.fileExtensions.includes(fileExtension)) {
      if (size < (selectedViewer.maxSizePreview || 50e6)) {
        selectedViewer = viewer
        autoPreview = size < viewer.maxSizeAutoPreview
        break
      }
    }
  }

  const [preview, setPreview] = useState(autoPreview)
  const [failedToPreview, setFailedToPreview] = useState(false)
  const [useFallbackViewer, setUseFallbackViewer] = useState(false)

  const data = useRef()
  const [dataLoaded, setDataLoaded] = useState(false)

  const encodedPath = path.split('/').map(segment => encodeURIComponent(segment)).join('/')
  let fullUrl = `${apiBase}/v1/uploads/${uploadId}/raw/${encodedPath}`
  if (fullUrl.startsWith('/')) {
    fullUrl = `${window.location.origin}${fullUrl}`
  }
  const [fullUrlWithAuth, setFullUrlWithAuth] = useState(undefined)

  useEffect(() => {
    if (preview && user && !fullUrlWithAuth && selectedViewer.requiresUrlWithAuth) {
      // Need to fetch signature token for the viewer
      api.get('/auth/signature_token')
        .then(response => {
          const fullUrlWithAuth = new URL(fullUrl)
          fullUrlWithAuth.searchParams.append('signature_token', response.signature_token)
          setFullUrlWithAuth(fullUrlWithAuth.href)
        })
        .catch(raiseError)
    }
    if (preview && selectedViewer.requiresLoadedData && data.current === undefined) {
      // Need to load the file data content for the viewer
      data.current = null
      api.get(fullUrl)
        .then(response => {
          data.current = response
          setDataLoaded(true)
        })
        .catch(raiseError)
    }
  }, [preview, selectedViewer, user, fullUrl, fullUrlWithAuth, setFullUrlWithAuth, data, dataLoaded, setDataLoaded, api, raiseError])

  if (!preview) {
    return (
      <Box margin={2} textAlign="center">
        <Button onClick={() => setPreview(true)} variant="contained" size="small" color="primary">
          Preview with {selectedViewer.name} viewer
        </Button>
      </Box>
    )
  }

  const url = user ? fullUrlWithAuth : fullUrl
  if ((selectedViewer.requiresUrlWithAuth && !url) || (selectedViewer.requiresLoadedData && !dataLoaded)) {
    // Not ready to invoke the viewer yet
    return <Typography>Loading...</Typography>
  }

  if (!failedToPreview) {
    try {
      return selectedViewer.render({uploadId, path, url, data, setFailedToPreview, classes})
    } catch (error) {
      setFailedToPreview(true)
    }
  }
  // Selected viewer failed
  if (!useFallbackViewer) {
    return (
      <Box textAlign="center">
        <Typography color="error">Failed to open with {selectedViewer.name} viewer. Bad file format?</Typography>
        <Button onClick={() => setUseFallbackViewer(true)} variant="contained" size="small" color="primary">
          Open with text viewer
        </Button>
      </Box>
    )
  }
  // Use the text viewer as last resort
  return viewerText.render({uploadId, path, url, data, setFailedToPreview, classes})
})
FilePreview.propTypes = {
  uploadId: PropTypes.string.isRequired,
  path: PropTypes.string.isRequired,
  size: PropTypes.number.isRequired
}
export default FilePreview

const useFilePreviewTextStyles = makeStyles(theme => ({
  containerDiv: {
    width: '100%',
    height: '100%',
    overflow: 'auto',
    backgroundColor: theme.palette.primary.dark
  },
  fileContents: {
    margin: 0,
    padding: 0,
    display: 'inline-block',
    color: theme.palette.primary.contrastText,
    fontFamily: 'Consolas, "Liberation Mono", Menlo, Courier, monospace',
    fontSize: 12,
    minWidth: '100%'
  }
}))
function FilePreviewText({uploadId, path}) {
  const classes = useFilePreviewTextStyles()
  const {api} = useApi()
  const {raiseError} = useErrors()
  const [contents, setContents] = useState(null)
  const [hasMore, setHasMore] = useState(true)
  const [loading, setLoading] = useState(false)
  const containerRef = React.createRef()

  const encodedPath = path.split('/').map(segment => encodeURIComponent(segment)).join('/')

  const loadMore = useCallback(() => {
    // The infinite scroll component has the issue if calling load more whenever it
    // gets updates, therefore calling this infinitely before it gets any chances of
    // receiving the results (https://github.com/CassetteRocks/react-infinite-scroller/issues/163).
    // Therefore, we have to set hasMore to false first and set it to true again after
    // receiving actual results.    setLoading(true)
    if (hasMore && !loading) {
      api.get(
        `/uploads/${uploadId}/raw/${encodedPath}`,
        {
          offset: contents?.length || 0,
          length: 16 * 1024,
          decompress: true,
          ignore_mime_type: true
        },
        {transformResponse: []})
        .then(contents => {
          setContents(old => (old || '') + (contents || ''))
          setHasMore(contents?.length === 16 * 1024)
        })
        .catch(raiseError)
        .finally(() => setLoading(false))
    }
  }, [uploadId, encodedPath, loading, hasMore, setHasMore, setContents, api, raiseError, contents])

  if (loading && !contents) {
    return <Typography>Loading ...</Typography>
  }
  return (
    <div ref={containerRef} className={classes.containerDiv}>
      <InfiniteScroll
        pageStart={0}
        loadMore={loadMore}
        hasMore={hasMore}
        useWindow={false}
        getScrollParent={() => containerRef.current}
      >
        <pre className={classes.fileContents}>
          {contents}
          &nbsp;
        </pre>
      </InfiniteScroll>
    </div>
  )
}
FilePreviewText.propTypes = {
  uploadId: PropTypes.string.isRequired,
  path: PropTypes.string.isRequired
}

const useFilePreviewPdfStyles = makeStyles(theme => ({
  containerDiv: {
    width: '100%',
    height: '100%',
    overflowX: 'hidden',
    overflowY: 'scroll',
    border: '1px solid black',
    boxSizing: 'border-box'
  },
  pageDiv: {
    border: '5px solid gray'
  }
}))
const FilePreviewPdf = React.memo(props => {
  const classes = useFilePreviewPdfStyles()
  const containerRef = useRef()
  const [numPages, setNumPages] = useState(null)
  const [pageWidth, setPageWidth] = useState()

  useLayoutEffect(() => {
    if (containerRef.current) {
      setPageWidth(containerRef.current.clientWidth - 10) // The -10 is because of the borders
    }
  }, [])

  function onDocumentLoadSuccess({ numPages }) {
    setNumPages(numPages)
  }

  return (
    <div className={classes.containerDiv} ref={containerRef}>
      <Document onLoadSuccess={onDocumentLoadSuccess} renderMode="svg" {...props}>
        {numPages && pageWidth &&
          Array(numPages).fill().map((_, i) =>
            <div className={classes.pageDiv} key={`pdfPageDiv${i + 1}`}>
              <Page pageNumber={i + 1} key={`pdfPage${i + 1}`} width={pageWidth}/>
            </div>)
        }
      </Document>
    </div>)
})