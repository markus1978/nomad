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
import React from 'react'
import { makeStyles } from '@material-ui/core/styles'
import {
  Box,
  Button,
  Dialog,
  DialogContent,
  DialogActions
} from '@material-ui/core'
import PropTypes from 'prop-types'
import clsx from 'clsx'
import AspectRatio from './AspectRatio'

/**
 * Component that wraps it's children in a container that can be 'floated',
 * i.e. displayed on an html element that is positioned relative to the
 * viewport and is above all other elements.
 */
export default function Floatable({
  className,
  classes,
  float,
  children,
  aspectRatio,
  onFloat
}) {
  // Styles
  const useStyles = makeStyles((theme) => {
    // Calculate the fullscreen size
    const actionsHeight = 52.5 // Size of the actions element that is shown when floating
    const padding = 20 // Padding arount the floating object
    const maxWidth = 1280 // Maximum width for the floating window
    const margin = 0.1 * (window.innerHeight) + actionsHeight
    const windowHeight = window.innerHeight - margin
    const windowWidth = Math.min(window.innerWidth, maxWidth) - margin
    const windowRatio = windowWidth / windowHeight
    let width
    let height
    if (windowRatio > aspectRatio) {
      width = (windowHeight) * aspectRatio + 2 * padding + 'px'
      height = windowHeight + actionsHeight + 2 * padding
    } else {
      width = windowWidth + 2 * padding
      height = (windowWidth) / aspectRatio + actionsHeight + 2 * padding + 'px'
    }

    return {
      root: {
      },
      dialogContent: {
        boxSizing: 'border-box',
        padding: padding
      },
      'dialogContent:first-child': {
        paddingTop: `${padding} !important`
      },
      dialogActions: {
        height: actionsHeight,
        boxSizing: 'border-box'
      },
      dialogRoot: {
        width: width,
        height: height,
        margin: 0,
        padding: 0,
        maxWidth: 'none',
        maxHeight: 'none',
        boxSizing: 'border-box'
      }
    }
  })
  const style = useStyles({classes: classes})

  return (
    <Box className={clsx(style.root, className)}>
      <AspectRatio aspectRatio={aspectRatio}>
        {float ? '' : children}
      </AspectRatio>
      <Dialog fullWidth={false} maxWidth={false} open={float}
        classes={{paper: style.dialogRoot}}
      >
        <DialogContent className={[style.dialogContent, style['dialogContent:first-child']].join('_')}>
          <AspectRatio aspectRatio={aspectRatio}>
            {float ? children : ''}
          </AspectRatio>
        </DialogContent>
        <DialogActions className={style.dialogActions}>
          <Button onClick={() => onFloat(float)}>
            Close
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}

Floatable.propTypes = {
  /**
   * Whether this component should be in floating mode or not.
   */
  float: PropTypes.bool.isRequired,
  /**
   * Fixed aspect ratio that is enforced for this component.
   */
  aspectRatio: PropTypes.number.isRequired,
  /**
   * Callback that is called whenever this component requests a change in the
   * float property. The callback accepts one parameter: 'float' that is a
   * boolean indicating the current float status.
   */
  onFloat: PropTypes.any,
  children: PropTypes.any,
  className: PropTypes.string,
  classes: PropTypes.object
}
Floatable.defaultProps = {
  float: false
}
