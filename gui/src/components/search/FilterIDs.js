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
import PropTypes from 'prop-types'
import clsx from 'clsx'
import { makeStyles } from '@material-ui/core/styles'
import { Grid } from '@material-ui/core'
import FilterText from './FilterText'

const useStyles = makeStyles(theme => ({
  root: {
    width: '100%'
  }
}))

const FilterIDs = React.memo(({
  visible,
  className
}) => {
  const styles = useStyles()

  return <div className={clsx(className, styles.root)}>
    <Grid container spacing={2}>
      <Grid item xs={12}>
        <FilterText
          quantity="entry_id"
          visible={visible}
          autocomplete='off'
        />
      </Grid>
      <Grid item xs={12}>
        <FilterText
          quantity="upload_id"
          visible={visible}
          autocomplete='off'
        />
      </Grid>
      <Grid item xs={12}>
        <FilterText
          quantity="results.material.material_id"
          visible={visible}
          autocomplete='off'
        />
      </Grid>
      <Grid item xs={12}>
        <FilterText
          quantity="datasets.dataset_id"
          visible={visible}
          autocomplete='off'
        />
      </Grid>
    </Grid>
  </div>
})
FilterIDs.propTypes = {
  visible: PropTypes.bool,
  className: PropTypes.string
}

export default FilterIDs
