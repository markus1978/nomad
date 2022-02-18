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
import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import PropTypes from 'prop-types'

/**
 * Will look at the clientHeight after each render and will keep the minHeight at
 * the maximum observed height. Allows to keep the height of a component more consistent
 * and avoid confusing layout changes.
 */
const KeepMaxHeight = React.memo(function KeepMaxHeight({children}) {
  const [height, setHeight] = useState(null)
  const ref = useRef()
  const handleChange = useCallback(() => {
    // TODO Don't know why the height does not seem to be exact and needs another "20"
    setHeight(height => Math.max(height, ref.current.offsetHeight + 20))
  }, [setHeight, ref])

  useLayoutEffect(() => {
    handleChange()
  }, [handleChange])

  useEffect(() => {
    const targetElement = ref.current
    targetElement.addEventListener('resize', handleChange)
    return () => {
      targetElement.removeEventListener('resize', handleChange)
    }
  }, [ref, handleChange])

  return <div ref={ref} style={{minHeight: height}}>{children}</div>
})
KeepMaxHeight.propTypes = {
  children: PropTypes.oneOfType([
    PropTypes.arrayOf(PropTypes.node),
    PropTypes.node
  ])
}

export default KeepMaxHeight
