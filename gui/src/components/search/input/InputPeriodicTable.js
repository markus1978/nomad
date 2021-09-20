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
import React, { useMemo, useCallback, useState, useEffect, useRef } from 'react'
import PropTypes from 'prop-types'
import elementData from '../../../elementData'
import {
  Typography,
  ButtonBase,
  Tooltip
} from '@material-ui/core'
import InputCheckbox from './InputCheckbox'
import AspectRatio from '../../visualization/AspectRatio'
import { makeStyles } from '@material-ui/core/styles'
import {
  useFilterState,
  useAgg
} from '../SearchContext'
import { isNil } from 'lodash'
import clsx from 'clsx'

// A fixed 2D, 10x18 array for the element data.
const elements = []
for (var i = 0; i < 10; i++) {
  elements[i] = Array.apply(null, Array(18))
}
elementData.elements.forEach(element => {
  elements[element.ypos - 1][element.xpos - 1] = element
  element.category = element.category.replace(' ', '')
})

/**
 * A single element in the periodic table.
*/
const useElementStyles = makeStyles(theme => ({
  root: {
    width: '100%',
    height: '100%',
    position: 'relative',
    backgroundColor: theme.palette.secondary.veryLight
  },
  fit: {
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    position: 'absolute'
  },
  bg: {
    opacity: 0,
    willChange: 'opacity',
    transition: 'opacity 250ms',
    backgroundColor: theme.palette.secondary.main
  },
  disabled: {
    opacity: 1,
    willChange: 'opacity',
    transition: 'opacity 250ms',
    backgroundColor: '#eee'
  },
  selected: {
    backgroundColor: theme.palette.primary.dark,
    display: 'none'
  },
  visible: {
    display: 'block'
  },
  button: {
    color: theme.palette.text.default,
    width: '100%',
    height: '100%',
    border: '1px solid',
    borderColor: '#555',
    textAlign: 'center',
    fontFamily: theme.typography.fontFamily,
    fontSize: '1rem',
    fontWeight: 600,
    '&:hover': {
      boxShadow: theme.shadows[4]
    }
  },
  buttonSelected: {
    color: 'white'
  },
  buttonDisabled: {
    borderColor: '#999',
    color: theme.palette.text.disabled
  },
  number: {
    position: 'absolute',
    top: 0,
    left: 2,
    margin: 0,
    padding: 0,
    fontSize: 8,
    pointerEvents: 'none'
  },
  numberSelected: {
    color: 'white'
  },
  numberDisabled: {
    color: '#BDBDBD'
  }
}))

const Element = React.memo(({
  element,
  selected,
  disabled,
  onClick,
  max,
  count,
  localFilter
}) => {
  const styles = useElementStyles()

  // Dynamically calculated styles. The background color is formed by animating
  // opacity: opacity animation can be GPU-accelerated by the browser unlike
  // animating the color property.
  const useDynamicStyles = makeStyles((theme) => {
    return {
      bg: { opacity: (isNil(count) || isNil(max)) ? 0 : count / max },
      disabled: { opacity: disabled ? 1 : 0 }
    }
  })
  const dynamicStyles = useDynamicStyles()

  const [selectedInternal, setSelectedInternal] = useState(selected)
  useEffect(() => {
    setSelectedInternal(selected)
  }, [selected])
  const disabledInternal = selectedInternal ? false : disabled

  const handleClick = useCallback(() => {
    setSelectedInternal(old => {
      const newValue = !old
      if (newValue) {
        localFilter.add(element.symbol)
      } else {
        localFilter.delete(element.symbol)
      }
      return newValue
    })
    onClick()
  }, [onClick, element, localFilter])

  return <div className={styles.root}>
    <div className={clsx(styles.fit, styles.bg, dynamicStyles.bg)}/>
    <div className={clsx(styles.fit, styles.disabled, dynamicStyles.disabled)}/>
    <div className={clsx(styles.fit, styles.selected, selectedInternal && styles.visible)}/>
    <Tooltip title={element.name}>
      <span>
        <ButtonBase
          className={clsx(
            styles.fit,
            styles.button,
            selectedInternal && styles.buttonSelected,
            disabledInternal && styles.buttonDisabled)
          }
          disabled={disabledInternal}
          onClick={handleClick}
          variant="contained"
        >
          {element.symbol}
        </ButtonBase>
      </span>
    </Tooltip>
    <Typography
      className={clsx(
        styles.number,
        selectedInternal && styles.numberSelected,
        disabledInternal && styles.numberDisabled
      )}
      variant="caption"
    >
      {element.number}
    </Typography>
  </div>
})

Element.propTypes = {
  element: PropTypes.object.isRequired,
  onClick: PropTypes.func,
  selected: PropTypes.bool,
  disabled: PropTypes.bool,
  max: PropTypes.number,
  count: PropTypes.number,
  localFilter: PropTypes.object
}

/**
 * Represents a single element in the periodic table.
*/
const useTableStyles = makeStyles(theme => ({
  root: {
    position: 'relative'
  },
  table: {
    width: '100%',
    height: '100%',
    tableLayout: 'fixed'
  },
  formContainer: {
    position: 'absolute',
    top: theme.spacing(-0.2),
    left: '10%',
    textAlign: 'center'
  }
}))

function eqSet(as, bs) {
  if (isNil(as) || isNil(bs)) return false
  if (as.size !== bs.size) return false
  for (var a of as) if (!bs.has(a)) return false
  return true
}

const InputPeriodicTable = React.memo(({quantity, visible}) => {
  const styles = useTableStyles()
  const [filter, setFilter] = useFilterState(quantity)
  const localFilter = useRef(new Set())
  const [update, setUpdate] = useState(0)
  const agg = useAgg(quantity, visible)
  const availableValues = useMemo(() => {
    const elementCountMap = {}
    agg?.data && agg.data.forEach((value) => { elementCountMap[value.value] = value.count })
    return elementCountMap
  }, [agg])

  // The selected state of the periodic filter is kept in a local reference.
  // This way simply selecting an element does not cause a full re-render of the
  // table. To handle external changes to the filter state, the local state is
  // synced each time a change is triggered and only if the states differ, a
  // re-render is issued.
  useEffect(() => {
    if (!eqSet(filter, localFilter.current)) {
      localFilter.current = new Set(filter)
      setUpdate(old => old + 1)
    }
  }, [filter, setUpdate, localFilter])

  const onElementClicked = useCallback((element) => {
    setFilter(old => {
      let newValues
      if (old) {
        const isSelected = old?.has(element)
        isSelected ? old.delete(element) : old.add(element)
        newValues = new Set(old)
      } else {
        newValues = new Set([element])
      }
      return newValues
    })
  }, [setFilter])

  const table = useMemo(() => (<div className={styles.root}>
    <AspectRatio
      aspectRatio={18 / 10}
    >
      <table className={styles.table}>
        <tbody>
          {elements.map((row, i) => (
            <tr key={i}>
              {row.map((element, j) => (
                <td key={j}>
                  {element
                    ? <Element
                      element={element}
                      // disabled={!availableValues[element.symbol] && !filter?.has(element.symbol)}
                      disabled={!availableValues[element.symbol]}
                      onClick={() => onElementClicked(element.symbol)}
                      selected={localFilter.current.has(element.symbol)}
                      max={agg?.total}
                      count={availableValues[element.symbol]}
                      localFilter={localFilter.current}
                    />
                    : ''}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </AspectRatio>
    <div className={styles.formContainer}>
      <InputCheckbox
        quantity="exclusive"
        label="only composition that exclusively contain these atoms"
        description="Search for entries with compositions that only (exclusively) contain the selected atoms. The default is to return all entries that have at least (inclusively) the selected atoms."
        initialValue={false}
      ></InputCheckbox>
    </div>
  </div>
  ), [agg, availableValues, onElementClicked, styles, update])

  return table
})

InputPeriodicTable.propTypes = {
  quantity: PropTypes.string,
  visible: PropTypes.bool
}

export default InputPeriodicTable
