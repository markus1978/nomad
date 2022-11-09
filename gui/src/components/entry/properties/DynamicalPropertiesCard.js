/* eslint-disable no-unused-vars */
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
import { PropertyCard } from './PropertyCard'
import { MeanSquaredDisplacements } from '../../visualization/MeanSquaredDisplacement'

/**
 * Card for displaying dynamical properties.
 */
const DynamicalPropertiesCard = React.memo(({index, properties, archive}) => {
  // Check what data is available and do not show the card if none of the properties are
  // available.
  const hasMsd = properties.has('mean_squared_displacement')
  if (!hasMsd) return null

  return <PropertyCard title="Dynamical properties">
    {hasMsd && <MeanSquaredDisplacements index={index} archive={archive}/>}
  </PropertyCard>
})

DynamicalPropertiesCard.propTypes = {
  index: PropTypes.object.isRequired,
  properties: PropTypes.object.isRequired,
  archive: PropTypes.object
}

export default DynamicalPropertiesCard
