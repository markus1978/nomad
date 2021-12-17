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

import React, { useContext, useRef, useLayoutEffect, useMemo } from 'react'
import PropTypes from 'prop-types'
import { RecoilRoot } from 'recoil'
import { makeStyles, Card, CardContent, Box, Typography } from '@material-ui/core'
import grey from '@material-ui/core/colors/grey'
import ArrowRightIcon from '@material-ui/icons/ArrowRight'
import classNames from 'classnames'
import { useLocation, useRouteMatch, Link } from 'react-router-dom'
import { ErrorHandler } from '../ErrorHandler'

export function formatSubSectionName(name) {
  // return name.startsWith('section_') ? name.slice(8) : name
  return name
}

export class Adaptor {
  constructor(e) {
    this.e = e

    if (new.target === Adaptor) {
      throw new TypeError('Cannot construct Abstract instances directly')
    }
  }

  itemAdaptor(key) {
    return null
  }

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
    overflow: 'scroll',
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

  useLayoutEffect(() => {
    function update() {
      const height = window.innerHeight - outerRef.current.getBoundingClientRect().top - 24
      rootRef.current.style.height = `${height}px`
      const scrollAmmount = innerRef.current.clientWidth - outerRef.current.clientWidth
      outerRef.current.scrollLeft = Math.max(scrollAmmount, 0)
    }
    update()
    window.addEventListener('resize', update)
    return () => window.removeEventListener('resize', update)
  })

  const { pathname } = useLocation()
  const { url } = useRouteMatch()
  const archivePath = pathname.substring(url.length).split('/')

  const root = useMemo(() => ({
    key: 'root',
    path: url.endsWith('/') ? url.substring(0, url.length - 1) : url,
    adaptor: adaptor,
    next: null
  }), [adaptor, url])

  const memoedAdapters = useRef({})
  const lanes = useMemo(() => {
    const lanes = [root]
    archivePath.filter(segment => segment).forEach((segment, i) => {
      const prev = lanes[i]
      const path = `${prev.path}/${segment}`
      const adaptor = memoedAdapters.current[path] || prev.adaptor.itemAdaptor(segment)
      memoedAdapters.current[path] = adaptor
      const lane = {
        key: segment,
        path: path,
        adaptor: adaptor
      }
      lanes.push(lane)
      prev.next = lane
    })
    return lanes
  }, [root, archivePath, memoedAdapters])

  return <RecoilRoot>
    {form}
    <Card>
      <CardContent>
        <div className={classes.root} ref={rootRef} >
          <div className={classes.lanesContainer} ref={outerRef} >
            <div className={classes.lanes} ref={innerRef} >
              {lanes.map((lane, index) => (
                <Lane key={lane.key} lane={lane} />
              ))}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  </RecoilRoot>
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
const Lane = React.memo(function Lane({lane}) {
  const classes = useLaneStyles()
  const { key, selected, adaptor, next } = lane
  const content = useMemo(() => {
    return <div className={classes.root}>
      <div className={classes.container}>
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
  }, [key, selected, adaptor, next?.key, classes])
  return content
})
Lane.propTypes = ({
  lane: PropTypes.object.isRequired
})

const useItemStyles = makeStyles(theme => ({
  root: {
    maxWidth: 500,
    color: theme.palette.text.primary,
    textDecoration: 'none',
    margin: `0 -${theme.spacing(1)}px`,
    padding: `0 0 0 ${theme.spacing(1)}px`,
    whiteSpace: 'nowrap',
    display: 'flex'
  },
  rootSelected: {
    backgroundColor: theme.palette.primary.main,
    color: theme.palette.primary.contrastText,
    whiteSpace: 'nowrap'
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
  }
}))

export function Item({children, itemKey, disabled}) {
  const classes = useItemStyles()
  const lane = useContext(laneContext)
  const selected = lane.next && lane.next.key
  if (disabled) {
    return <div className={classNames(classes.childContainer, classes.disabled)}>{children}</div>
  }
  return <Link
    className={classNames(
      classes.root,
      selected === itemKey ? classes.rootSelected : classes.rootUnSelected
    )}
    to={`${lane.path}/${itemKey}`}
  >
    <span className={classes.childContainer}>{children}</span>
    <ArrowRightIcon/>
  </Link>
}
Item.propTypes = ({
  children: PropTypes.oneOfType([
    PropTypes.arrayOf(PropTypes.node),
    PropTypes.node
  ]).isRequired,
  itemKey: PropTypes.string.isRequired,
  disabled: PropTypes.bool
})

export function Content({children}) {
  return <Box padding={1} maxWidth={1024}>
    {children}
  </Box>
}
Content.propTypes = ({
  children: PropTypes.oneOfType([
    PropTypes.arrayOf(PropTypes.node),
    PropTypes.node
  ]).isRequired
})

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
