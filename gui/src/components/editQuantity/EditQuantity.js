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
import React, {useCallback, useEffect, useRef, useState} from 'react'
import {
  TextField,
  makeStyles,
  Box,
  FormControlLabel,
  Checkbox,
  IconButton,
  InputAdornment,
  MenuItem,
  Dialog,
  DialogContent,
  FormControl,
  FormLabel, RadioGroup, Radio, Slider
} from '@material-ui/core'
import PropTypes from 'prop-types'
import {convertUnit, Unit, useUnits} from '../../units'
import {conversionMap, unitMap} from '../../unitsData'
import AutoComplete from '@material-ui/lab/Autocomplete'
import HelpOutlineIcon from '@material-ui/icons/HelpOutline'
import DialogActions from '@material-ui/core/DialogActions'
import Button from '@material-ui/core/Button'
import Markdown from '../Markdown'
import {dateFormat} from 'nomad-fair-gui/src/config'
import {KeyboardDatePicker} from '@material-ui/pickers'
import {getTime} from 'date-fns'

const HelpDialog = React.memo(({title, description}) => {
  const [open, setOpen] = useState(false)

  return <React.Fragment>
    {description && <IconButton size="small" onClick={() => setOpen(true)}>
      {<HelpOutlineIcon fontSize='small'/>}
    </IconButton>}
    {open && <Dialog open={open}>
      <DialogContent>
        <Markdown>{`
        ### ${title}
        ${description}
      `}</Markdown>
      </DialogContent>
      <DialogActions>
        <span style={{flexGrow: 1}} />
        <Button onClick={() => setOpen(false)} color="secondary">
          Close
        </Button>
      </DialogActions>

    </Dialog>}
  </React.Fragment>
})
HelpDialog.propTypes = {
  title: PropTypes.string,
  description: PropTypes.string
}

const useHelpAdornmentStyles = makeStyles(theme => ({
  root: {},
  withOtherAdornment: {
    marginRight: theme.spacing(3)
  }
}))

const HelpAdornment = React.memo(({title, description, withOtherAdornment}) => {
  const classes = useHelpAdornmentStyles()
  return <InputAdornment
    position="end"
    className={withOtherAdornment ? classes.withOtherAdornment : classes.root}
  >
    <HelpDialog title={title} description={description}/>
  </InputAdornment>
})
HelpAdornment.propTypes = {
  withOtherAdornment: PropTypes.bool,
  title: PropTypes.string,
  description: PropTypes.string
}

const useWithHelpStyles = makeStyles(theme => ({
  root: {
    '&:not(:hover)': {
      '& #help': {
        display: 'none'
      }
    }
  }
}))

const TextFieldWithHelp = React.memo((props) => {
  const {withOtherAdornment, helpTitle, helpDescription, ...otherProps} = props
  const classes = useWithHelpStyles()
  return <TextField
    className={classes.root}
    InputProps={{endAdornment: (
      <div id="help">
        <HelpAdornment title={helpTitle} description={helpDescription} withOtherAdornment={withOtherAdornment}/>
      </div>
    )}}
    {...otherProps}
  />
})
TextFieldWithHelp.propTypes = {
  withOtherAdornment: PropTypes.bool,
  helpTitle: PropTypes.string,
  helpDescription: PropTypes.string
}

const WithHelp = React.memo((props) => {
  const {helpTitle, helpDescription, ...otherProps} = props
  const classes = useWithHelpStyles()
  return <Box display="flex" alignItems="center" className={classes.root}>
    <Box flexGrow={1} {...otherProps}/>
    <Box>
      <div id="help">
        <HelpDialog title={helpTitle} description={helpDescription} />
      </div>
    </Box>
  </Box>
})
WithHelp.propTypes = {
  helpTitle: PropTypes.string,
  helpDescription: PropTypes.string
}

export const StringEditQuantity = React.memo((props) => {
  const {quantityDef, section, onChange, ...otherProps} = props
  const label = otherProps.label || quantityDef.name
  const [value, setValue] = useState()

  useEffect(() => {
    setValue(section[quantityDef.name])
  }, [quantityDef, section])

  const handleChange = useCallback((newValue) => {
    setValue(newValue || '')
    if (onChange) {
      onChange(newValue, section, quantityDef)
    }
  }, [onChange, quantityDef, section])

  return <TextFieldWithHelp
    fullWidth variant='filled' size='small'
    label={label}
    value={value || ''}
    placeholder={quantityDef.description}
    onChange={event => handleChange(event.target.value)} {...otherProps}
    helpTitle={label} helpDescription={quantityDef.description}
  />
})
StringEditQuantity.propTypes = {
  quantityDef: PropTypes.object.isRequired,
  section: PropTypes.object.isRequired,
  onChange: PropTypes.func.isRequired
}

const useNumberEditQuantityStyles = makeStyles(theme => ({
  unitSelect: {
    marginLeft: theme.spacing(1),
    width: '150px'
  }
}))

export const NumberEditQuantity = React.memo((props) => {
  const classes = useNumberEditQuantityStyles()
  const {quantityDef, section, onChange, minValue, maxValue, ...otherProps} = props
  const label = otherProps.label || quantityDef.name
  const [value, setValue] = useState()
  const [convertedValue, setConvertedValue] = useState()
  const [error, setError] = useState('')
  const systemUnits = useUnits()
  const defaultValue = (quantityDef.default !== undefined ? quantityDef.default : '')
  const dimension = quantityDef.unit && unitMap[quantityDef.unit].dimension
  const units = quantityDef.unit && conversionMap[dimension].units
  const isUnit = quantityDef.unit && ['float64', 'float32', 'float'].includes(quantityDef.type?.type_data)
  const [unit, setUnit] = useState(systemUnits[dimension] || quantityDef.unit)
  const timeout = useRef()

  useEffect(() => {
    let newValue = section[quantityDef.name] || defaultValue
    setValue(newValue)
    setConvertedValue(`${(isUnit ? (!isNaN(Number(newValue)) || newValue === '' ? convertUnit(Number(newValue), quantityDef.unit, unit) : '') : newValue)}`)
  }, [defaultValue, isUnit, quantityDef, section, unit])

  const handleChangeUnit = useCallback((newUnit) => {
    setUnit(newUnit)
    setConvertedValue(`${(isUnit ? (!isNaN(Number(value)) || value === '' ? convertUnit(Number(value), quantityDef.unit, newUnit) : '') : value)}`)
  }, [isUnit, quantityDef, value])

  const isValidNumber = useCallback((value) => {
    if (['int64', 'int32', 'int'].includes(quantityDef.type?.type_data)) {
      const num = Number(value)
      return Number.isInteger(num)
    } else if (['uint64', 'uint32', 'uint'].includes(quantityDef.type?.type_data)) {
      const num = Number(value)
      return Number.isInteger(num) && num > 0
    } else if (['float64', 'float32', 'float'].includes(quantityDef.type?.type_data)) {
      const num = Number(value)
      return !isNaN(num)
    }
  }, [quantityDef])

  const validation = useCallback((newValue) => {
    setError('')
    if (newValue === '') {
      setConvertedValue('')
      setValue('')
    } else if (!isValidNumber(newValue)) {
      setError('Please enter a valid number!')
    } else {
      let originalValue = (isUnit ? convertUnit(Number(newValue), unit, quantityDef.unit) : newValue)
      if (minValue !== undefined && originalValue < minValue) {
        setError(`The value should be higher than or equal to ${minValue}${(isUnit ? `${(new Unit(quantityDef.unit)).label()}` : '')}`)
      } else if (maxValue !== undefined && originalValue > maxValue) {
        setError(`The value should be less than or equal to ${maxValue}${(isUnit ? `${(new Unit(quantityDef.unit)).label()}` : '')}`)
      } else {
        setValue(originalValue)
        setConvertedValue(`${Number(newValue)}`)
      }
    }
  }, [isUnit, isValidNumber, maxValue, minValue, quantityDef, unit])

  const handleChangeValue = useCallback((newValue) => {
    setConvertedValue(`${newValue}`)
    if (onChange) {
      onChange((isUnit ? (newValue === '' ? newValue : (!isNaN(Number(newValue)) ? convertUnit(Number(newValue), unit, quantityDef.unit) : '')) : newValue), section, quantityDef)
    }
    clearTimeout(timeout.current)
    timeout.current = setTimeout(() => {
      validation(newValue)
    }, 1000)
  }, [isUnit, validation, unit, onChange, quantityDef, section, timeout])

  const handleValidator = useCallback((event) => {
    validation(event.target.value)
  }, [validation])

  return <Box display='flex'>
    <TextFieldWithHelp
      fullWidth variant='filled' size='small'
      label={label}
      value={convertedValue || ''}
      onBlur={handleValidator} error={!!error} helperText={error}
      placeholder={quantityDef.description}
      onChange={event => handleChangeValue(event.target.value)}
      helpTitle={label} helpDescription={quantityDef.description}
      {...otherProps}
    />
    {isUnit && <TextField
      className={classes.unitSelect} variant='filled' size='small' select
      label="unit" value={unit}
      onChange={(event) => handleChangeUnit(event.target.value)}
    >
      {units.map(unit => <MenuItem key={unit} value={unit}>{(new Unit(unit)).label()}</MenuItem>)}
    </TextField>}
  </Box>
})
NumberEditQuantity.propTypes = {
  maxValue: PropTypes.number,
  minValue: PropTypes.number,
  quantityDef: PropTypes.object.isRequired,
  section: PropTypes.object.isRequired,
  onChange: PropTypes.func.isRequired
}

export const EnumEditQuantity = React.memo((props) => {
  const {quantityDef, section, onChange, ...otherProps} = props
  const label = otherProps.label || quantityDef.name
  const [value, setValue] = useState(section[quantityDef.name] || quantityDef.default || '')

  const handleChange = useCallback((value) => {
    setValue(value)
    if (onChange) {
      onChange(value === '' ? undefined : value, section, quantityDef)
    }
  }, [onChange, quantityDef, section])

  return <TextFieldWithHelp
    select variant='filled' size='small' withOtherAdornment fullWidth
    label={label} {...otherProps} value={value}
    onChange={event => handleChange(event.target.value)}
    helpTitle={label} helpDescription={quantityDef.description}
  >
    {quantityDef.type?.type_data.map(item => <MenuItem value={item} key={item}>{item}</MenuItem>)}
  </TextFieldWithHelp>
})
EnumEditQuantity.propTypes = {
  quantityDef: PropTypes.object.isRequired,
  section: PropTypes.object.isRequired,
  onChange: PropTypes.func.isRequired
}

export const AutocompleteEditQuantity = React.memo((props) => {
  const {quantityDef, section, onChange, ...otherProps} = props
  const label = otherProps.label || quantityDef.name
  const [value, setValue] = useState(section[quantityDef.name] || quantityDef.default || null)

  const handleChange = useCallback((value) => {
    setValue(value)
    if (onChange) {
      onChange((value === '' ? undefined : value), section, quantityDef)
    }
  }, [onChange, quantityDef, section, setValue])

  return <AutoComplete
    options={quantityDef.type.type_data}
    onChange={(event, value) => handleChange(value)}
    ListboxProps={{style: {maxHeight: '150px'}}}
    value={value}
    renderInput={params => (
      <TextFieldWithHelp
        {...params}
        variant='filled' size='small' label={label}
        helpTitle={label} helpDescription={quantityDef.description}
        placeholder={quantityDef.description} fullWidth/>
    )}
    {...otherProps}
  />
})
AutocompleteEditQuantity.propTypes = {
  quantityDef: PropTypes.object.isRequired,
  section: PropTypes.object.isRequired,
  onChange: PropTypes.func.isRequired
}

export const RadioButtonEditQuantity = React.memo((props) => {
  const {quantityDef, section, onChange, ...otherProps} = props
  const label = otherProps.label || quantityDef.name
  const [value, setValue] = useState(section[quantityDef.name] || quantityDef.default || '')

  const handleChange = useCallback((value) => {
    setValue(value)
    if (onChange) {
      onChange(value === '' ? undefined : value, section, quantityDef)
    }
  }, [onChange, quantityDef, section])

  return <FormControl>
    <FormLabel>{label}</FormLabel>
    <RadioGroup row>
      {quantityDef.type?.type_data.map(item => <FormControlLabel value={item} key={item} control={<Radio checked={value === item} onClick={event => handleChange(item)} {...otherProps}/>} label={item}/>)}
    </RadioGroup>
  </FormControl>
})
RadioButtonEditQuantity.propTypes = {
  quantityDef: PropTypes.object.isRequired,
  section: PropTypes.object.isRequired,
  onChange: PropTypes.func.isRequired
}

export const BoolEditQuantity = React.memo((props) => {
  const {quantityDef, section, onChange, ...otherProps} = props
  const label = otherProps.label || quantityDef.name
  const [value, setValue] = useState()
  const defaultValue = (quantityDef.default !== undefined ? quantityDef.default : '')

  useEffect(() => {
    setValue(section[quantityDef.name] || defaultValue)
  }, [defaultValue, quantityDef, section])

  const handleChange = useCallback((newValue) => {
    setValue(newValue)
    if (onChange) {
      onChange((newValue === '' ? defaultValue : newValue), section, quantityDef)
    }
  }, [defaultValue, onChange, quantityDef, section])

  return <WithHelp helpTitle={label} helpDescription={quantityDef.description}>
    <FormControlLabel
      label={label}
      control={<Checkbox onChange={event => handleChange(event.target.checked)} color="primary" checked={(!!value)} {...otherProps}/>}
    />
  </WithHelp>
})
BoolEditQuantity.propTypes = {
  quantityDef: PropTypes.object.isRequired,
  section: PropTypes.object.isRequired,
  onChange: PropTypes.func.isRequired
}

export const SliderEditQuantity = React.memo((props) => {
  const classes = useNumberEditQuantityStyles()
  const {quantityDef, section, onChange, minValue, maxValue, ...otherProps} = props
  const label = otherProps.label || quantityDef.name
  const defaultValue = (quantityDef.default !== undefined ? quantityDef.default : undefined)
  const [value, setValue] = useState(0)
  const [convertedValue, setConvertedValue] = useState(0)
  const dimension = quantityDef.unit && unitMap[quantityDef.unit].dimension
  const units = quantityDef.unit && conversionMap[dimension].units
  const systemUnits = useUnits()
  const isUnit = quantityDef.unit && ['float64', 'float32', 'float'].includes(quantityDef.type?.type_data)
  const [unit, setUnit] = useState(systemUnits[dimension] || quantityDef.unit)

  useEffect(() => {
    let newValue = section[quantityDef.name] || defaultValue || minValue
    setValue(newValue)
    setConvertedValue(`${(isUnit ? (!isNaN(Number(newValue)) || newValue === '' ? convertUnit(Number(newValue), quantityDef.unit, unit) : '') : newValue)}`)
  }, [defaultValue, isUnit, minValue, quantityDef, section, unit])

  const handleChangeUnit = useCallback((newUnit) => {
    setUnit(newUnit)
    setConvertedValue(`${(isUnit ? (!isNaN(Number(value)) || value === '' ? convertUnit(Number(value), quantityDef.unit, newUnit) : '') : value)}`)
  }, [isUnit, quantityDef, value])

  const handleChangeValue = useCallback((event, newValue) => {
    if (typeof newValue !== 'number') return
    setConvertedValue(`${newValue}`)
    if (onChange) {
      onChange((isUnit ? (newValue === '' ? newValue : (!isNaN(Number(newValue)) ? convertUnit(Number(newValue), unit, quantityDef.unit) : '')) : newValue), section, quantityDef)
    }
    setValue((isUnit ? (!isNaN(Number(newValue)) || newValue === '' ? convertUnit(Number(newValue), unit, quantityDef.unit) : '') : newValue))
    setConvertedValue(`${Number(newValue)}`)
  }, [isUnit, unit, onChange, quantityDef, section])

  return <FormControl fullWidth>
    <FormLabel>{label}</FormLabel>
    <Box display='flex'>
      <Slider
        value={Number(convertedValue)}
        min={convertUnit(Number(minValue), quantityDef.unit, unit)}
        max={convertUnit(Number(maxValue), quantityDef.unit, unit)}
        onChange={handleChangeValue}
        valueLabelDisplay={(!isUnit ? 'on' : 'off')}
        {...otherProps}/>
      {isUnit && <TextField
        className={classes.unitSelect} variant='filled' size='small' select
        label="unit" value={unit}
        onChange={(event) => handleChangeUnit(event.target.value)}
      >
        {units.map(unit => <MenuItem key={unit} value={unit}>{(new Unit(unit)).label()}</MenuItem>)}
      </TextField>}
    </Box>
  </FormControl>
})
SliderEditQuantity.propTypes = {
  maxValue: PropTypes.number,
  minValue: PropTypes.number,
  quantityDef: PropTypes.object.isRequired,
  section: PropTypes.object.isRequired,
  onChange: PropTypes.func.isRequired
}

export const DateEditQuantity = React.memo((props) => {
  const {quantityDef, section, onChange, ...otherProps} = props
  const defaultValue = (quantityDef.default !== undefined ? quantityDef.default : '')
  const label = otherProps.label || quantityDef.name
  const [value, setValue] = useState()
  const [current, setCurrent] = useState()
  const [error, setError] = useState('')

  useEffect(() => {
    setValue(section[quantityDef.name] || defaultValue || null)
  }, [defaultValue, quantityDef, section])

  const handleAccept = useCallback((newValue) => {
    if (newValue !== null && newValue !== undefined && isNaN(getTime(newValue))) {
      setError('Invalid date format.')
      return
    }
    setError('')
    if (newValue !== undefined) setValue(newValue)
    if (onChange) {
      onChange(newValue || '', section, quantityDef)
    }
  }, [onChange, quantityDef, section])

  const handleChange = useCallback((newValue) => {
    setCurrent(newValue)
  }, [])

  const handleBlur = useCallback(() => {
    handleAccept(current)
  }, [current, handleAccept])

  return <WithHelp helpTitle={label} helpDescription={quantityDef.description}>
    <KeyboardDatePicker
      error={!!error}
      variant="inline"
      inputVariant="outlined"
      label={label}
      value={value}
      format={dateFormat}
      invalidDateMessage={error}
      InputAdornmentProps={{ position: 'start' }}
      onAccept={handleAccept}
      onChange={handleChange}
      onBlur={handleBlur}
      onKeyDown={(event) => { if (event.key === 'Enter') { handleAccept(current) } }}
    />
  </WithHelp>
})
DateEditQuantity.propTypes = {
  quantityDef: PropTypes.object.isRequired,
  section: PropTypes.object.isRequired,
  onChange: PropTypes.func.isRequired
}

export const DateTimeEditQuantity = React.memo((props) => {
  const {quantityDef, section, onChange, ...otherProps} = props
  const defaultValue = (quantityDef.default !== undefined ? quantityDef.default : '')
  const label = otherProps.label || quantityDef.name
  const [value, setValue] = useState()
  const [current, setCurrent] = useState()
  const [error, setError] = useState('')

  useEffect(() => {
    setValue(section[quantityDef.name] || defaultValue || null)
  }, [defaultValue, quantityDef, section])

  const handleAccept = useCallback((newValue) => {
    if (newValue !== null && newValue !== undefined && isNaN(getTime(newValue))) {
      setError('Invalid date format.')
      return
    }
    setError('')
    if (newValue !== undefined) setValue(newValue)
    if (onChange) {
      onChange(newValue || '', section, quantityDef)
    }
  }, [onChange, quantityDef, section])

  const handleChange = useCallback((newValue) => {
    setCurrent(newValue)
  }, [])

  const handleBlur = useCallback(() => {
    handleAccept(current)
  }, [current, handleAccept])

  return <WithHelp helpTitle={label} helpDescription={quantityDef.description}>
    <KeyboardDatePicker
      error={!!error}
      variant="inline"
      inputVariant="outlined"
      label={label}
      value={value}
      format={'yyyy/MM/dd HH:mm'}
      invalidDateMessage={error}
      InputAdornmentProps={{ position: 'start' }}
      onAccept={handleAccept}
      onChange={handleChange}
      onBlur={handleBlur}
      onKeyDown={(event) => { if (event.key === 'Enter') { handleAccept(current) } }}
    />
  </WithHelp>
})
DateTimeEditQuantity.propTypes = {
  quantityDef: PropTypes.object.isRequired,
  section: PropTypes.object.isRequired,
  onChange: PropTypes.func.isRequired
}
