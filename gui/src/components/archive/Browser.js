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

import React, { useContext, useRef, useLayoutEffect, useMemo, useState, useCallback, createRef, useEffect } from 'react'
import PropTypes from 'prop-types'
import { makeStyles, Card, CardContent, Box, Typography, Grid, Chip, Tooltip } from '@material-ui/core'
import grey from '@material-ui/core/colors/grey'
import ArrowRightIcon from '@material-ui/icons/ArrowRight'
import classNames from 'classnames'
import { useLocation, useRouteMatch, Link } from 'react-router-dom'
import { ErrorHandler } from '../ErrorHandler'
import { useApi } from '../api'
import { useErrors } from '../errors'

function escapeBadPathChars(s) {
  return s.replace(/!/g, '!0').replace(/\?/g, '!1').replace(/#/g, '!2').replace(/%/g, '!3').replace(/\\/g, '!4')
}

function unescapeBadPathChars(s) {
  return s.replace(/!4/g, '\\').replace(/!3/g, '%').replace(/!2/g, '#').replace(/!1/g, '?').replace(/!0/g, '!')
}

export function formatSubSectionName(name) {
  // return name.startsWith('section_') ? name.slice(8) : name
  return name
}

/**
 * Browsers are made out of lanes. Each lane uses an adaptor that determines how to render
 * the lane contents and what adaptor is used for the next lane (depending on what is
 * selected in this lane).
 */
export class Adaptor {
  constructor(e) {
    this.e = e

    if (new.target === Adaptor) {
      throw new TypeError('Cannot construct Abstract instances directly')
    }
  }

  /**
   * A potentially asynchronous method that is called once when the adaptor was created
   * and is assigned to a lane.
   */
  initialize(api) {
  }

  /**
   * A potentially asynchronous method that is used to determine the adaptor for the
   * next lane depending on the given key/url segment.
   * @returns An adaptor that is used to render the next lane.
   */
  itemAdaptor(key, api) {
    return null
  }

  /**
   * Renders the contents of the current lane (the lane that this adaptor represents).
   */
  render() {
    return ''
  }
}

const useBrowserStyles = makeStyles(theme => ({
  root: {
    display: 'flex',
    flexFlow: 'column',
    margin: `-${theme.spacing(2)}px`,
    marginBottom: `-${theme.spacing(3)}px`
  },
  lanesContainer: {
    flex: '1 1 auto',
    height: '100%',
    overflowX: 'auto',
    overflowY: 'hidden',
    scrollBehavior: 'smooth'
  },
  lanes: {
    display: 'flex',
    overflow: 'hidden',
    height: '100%',
    overflowY: 'hidden',
    width: 'fit-content'
  }
}))
export const Browser = React.memo(function Browser({adaptor, form}) {
  const classes = useBrowserStyles()
  const rootRef = useRef()
  const outerRef = useRef()
  const innerRef = useRef()
  const { pathname } = useLocation()
  const { url } = useRouteMatch()

  const { api } = useApi()
  const { raiseError } = useErrors()

  useLayoutEffect(() => {
    function update() {
      const height = window.innerHeight - outerRef.current.getBoundingClientRect().top - 24
      rootRef.current.style.height = `${height}px`
      const scrollAmmount = innerRef.current.clientWidth - outerRef.current.clientWidth
      outerRef.current.scrollLeft = Math.max(scrollAmmount, 0)
    }
    if (url !== undefined) {
      update()
      window.addEventListener('resize', update)
      return () => window.removeEventListener('resize', update)
    }
  })

  const [, setRender] = useState(0)
  const update = useCallback(() => {
    setRender(current => current + 1)
  }, [setRender])
  const lanes = useRef(null)

  useEffect(() => {
    if (!url) {
      return
    }

    const rootPath = url.endsWith('/') ? url.substring(0, url.length - 1) : url
    const segments = ['root'].concat(pathname.substring(url.length).split('/').filter(segment => segment))

    async function computeLanes() {
      lanes.current = lanes.current || []
      if (lanes.current.length > segments.length) {
        // New path is shorter than the old path
        lanes.current = lanes.current.slice(0, segments.length)
        lanes.current[lanes.current.length - 1].next = null
      }
      for (let index = 0; index < segments.length; index++) {
        const segment = unescapeBadPathChars(segments[index])
        if (lanes.current.length > index) {
          if (lanes.current[index].key === segment) {
            // reuse the existing lane (incl. its adaptor and data)
            continue
          } else {
            // the path diverges, start to use new lanes from now on
            lanes.current = lanes.current.slice(0, index)
          }
        }
        const prev = index === 0 ? null : lanes.current[index - 1]
        const lane = {
          index: index,
          key: segment,
          path: prev ? prev.path + '/' + encodeURI(escapeBadPathChars(segment)) : rootPath,
          adaptor: prev ? await prev.adaptor.itemAdaptor(segment, api) : adaptor,
          next: null,
          update: update
        }
        if (prev) {
          prev.next = lane
        }
        if (lane.adaptor.initialize) {
          await lane.adaptor.initialize(api)
        }
        lanes.current.push(lane)
      }
    }
    computeLanes().then(() => update())
  }, [lanes, url, pathname, adaptor, update, api, raiseError])

  if (url === undefined) {
    // Can happen when navigating to another tab, possibly with the browser's back/forward buttons
    // We want to keep the cached lanes, in case the user goes back to this tab, so return immediately.
    return
  }

  return <React.Fragment>
    {form}
    <Card>
      <CardContent>
        <div className={classes.root} ref={rootRef} >
          <div className={classes.lanesContainer} ref={outerRef} >
            <div className={classes.lanes} ref={innerRef} >
              {lanes.current && lanes.current.map((lane, index) => (
                <Lane key={index} lane={lane} />
              ))}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  </React.Fragment>
})
Browser.propTypes = ({
  adaptor: PropTypes.object.isRequired,
  form: PropTypes.node
})
export default Browser

export const laneContext = React.createContext()
const useLaneStyles = makeStyles(theme => ({
  root: {
    width: 'min-content',
    borderRight: `solid 1px ${grey[500]}`,
    display: 'inline-block'
  },
  container: {
    minWidth: 300,
    display: 'inline-block',
    height: '100%',
    overflowY: 'scroll'
  },
  error: {
    margin: theme.spacing(1)
  }
}))
function Lane({lane}) {
  const classes = useLaneStyles()
  const containerRef = createRef()
  const { key, adaptor, next } = lane
  lane.containerRef = containerRef
  const content = useMemo(() => {
    if (!adaptor) {
      return ''
    }
    return <div className={classes.root} data-testid={`lane${lane.index}`}>
      <div className={classes.container} ref={containerRef}>
        <laneContext.Provider value={lane}>
          <ErrorHandler message='This section could not be rendered, due to an unexpected error.' className={classes.error}>
            {adaptor.render()}
          </ErrorHandler>
        </laneContext.Provider>
      </div>
    </div>
    // We deliberetly break the React rules here. The goal is to only update if the
    // lanes contents change and not the lane object.
    // eslint-disable-next-line
  }, [key, adaptor, next?.key, classes])
  return content
}
Lane.propTypes = ({
  lane: PropTypes.object.isRequired
})

const useItemStyles = makeStyles(theme => ({
  root: {
    color: theme.palette.text.primary,
    textDecoration: 'none',
    margin: `0 -${theme.spacing(1)}px`,
    padding: `0 0 0 ${theme.spacing(1)}px`,
    whiteSpace: 'nowrap',
    display: 'flex',
    '& $icon': {
      color: theme.palette.grey[700]
    }
  },
  rootSelected: {
    backgroundColor: theme.palette.primary.main,
    color: theme.palette.primary.contrastText,
    whiteSpace: 'nowrap',
    '& $icon': {
      color: theme.palette.primary.contrastText
    }
  },
  rootUnSelected: {
    '&:hover': {
      backgroundColor: grey[300]
    }
  },
  disabled: {
    color: 'grey'
  },
  childContainer: {
    flexGrow: 1,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap'
  },
  icon: {
    fontSize: 16,
    marginTop: 4
  }
}))

export function Item({children, itemKey, disabled, icon, actions, chip}) {
  const classes = useItemStyles()
  const lane = useContext(laneContext)
  const selected = lane.next && lane.next.key
  const isSelected = selected === itemKey
  if (disabled) {
    return <div className={classNames(classes.childContainer, classes.disabled)}>{children}</div>
  }
  return <Link
    className={classNames(
      classes.root,
      isSelected ? classes.rootSelected : classes.rootUnSelected
    )}
    to={`${lane.path}/${encodeURI(escapeBadPathChars(itemKey))}`}
  >
    <Grid container spacing={2} alignItems="center" wrap="nowrap">
      {icon && <Grid item>
        {React.createElement(icon, {fontSize: 'small', className: classes.icon})}
      </Grid>}
      <Grid item className={classes.childContainer}>
        <Typography>{children}</Typography>
      </Grid>
      {chip && (
        <Grid item>
          <Chip size="small" color={isSelected ? 'primary' : 'default'} label={chip} />
        </Grid>
      )}
      {actions && <Grid item>
        {actions}
      </Grid>}
    </Grid>
    <ArrowRightIcon/>
  </Link>
}
Item.propTypes = ({
  children: PropTypes.oneOfType([
    PropTypes.arrayOf(PropTypes.node),
    PropTypes.node
  ]).isRequired,
  itemKey: PropTypes.string.isRequired,
  disabled: PropTypes.bool,
  icon: PropTypes.elementType,
  chip: PropTypes.string,
  actions: PropTypes.oneOfType([
    PropTypes.arrayOf(PropTypes.node),
    PropTypes.node
  ])
})

export function Content(props) {
  return <Box maxWidth={1024} padding={1} {...props} />
}

export function Compartment({title, children, color}) {
  if (!React.Children.count(children)) {
    return ''
  }
  return <React.Fragment>
    <Box paddingTop={1} whiteSpace="nowrap">
      {title && <Typography color={color} variant="overline">{title}</Typography>}
    </Box>
    {children}
  </React.Fragment>
}
Compartment.propTypes = ({
  title: PropTypes.string,
  color: PropTypes.string,
  children: PropTypes.oneOfType([
    PropTypes.arrayOf(PropTypes.node),
    PropTypes.node
  ]).isRequired
})

export function Title({title, label, tooltip, actions, ...moreProps}) {
  return <Compartment>
    <Grid container justifyContent="space-between" wrap="nowrap" spacing={1}>
      <Grid item>
        {tooltip ? (
          <Tooltip title={tooltip}>
            <div style={{overflow: 'hidden', textOverflow: 'ellipsis'}}>
              <Typography variant="h6" {...moreProps}>{title}</Typography>
            </div>
          </Tooltip>
        ) : (
          <Typography variant="h6" {...moreProps}>{title}</Typography>
        )}
        {label && (
          <Typography variant="caption" color={moreProps.color}>
            {label}
          </Typography>
        )}
      </Grid>
      {actions && (
        <Grid item>
          {actions}
        </Grid>
      )}
    </Grid>
  </Compartment>
}
Title.propTypes = ({
  title: PropTypes.string.isRequired,
  label: PropTypes.string,
  tooltip: PropTypes.string,
  actions: PropTypes.oneOfType([
    PropTypes.arrayOf(PropTypes.node),
    PropTypes.node
  ])
})
