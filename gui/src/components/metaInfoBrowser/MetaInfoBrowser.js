
import React, { Component } from 'react'
import { withRouter } from 'react-router-dom'
import Viewer from './Viewer'
import PropTypes from 'prop-types'
import { withApi } from '../api'
import MetainfoSearch from './MetainfoSearch'
import { FormControl, withStyles, Select, Input, MenuItem, ListItemText, InputLabel } from '@material-ui/core'
import { compose } from 'recompose'
import { schema } from '../MetaInfoRepository'

export const help = `
The NOMAD *metainfo* defines all quantities used to represent archive data in
NOMAD. You could say it is the archive *schema*. You can browse this schema and
all its definitions here.

The NOMAD metainfo contains three different *kinds* of definitions:

- **sections**: A section is a nested groups of quantities that allow a hierarchical data structure
- **values**: Actual quantities that contain data
- **references**: References that allow to connect related sections.

All definitions have a name that you can search for. Furthermore, all definitions
are organized in packages. There is a *common* package with definitions that are
used by all codes and there are packages for each code with code specific definitions.
You can select the package to browse below.

Depending on the selected package, there are quite a large number of definitions.
You can use the *definition* field to search based on definition names.

All definitions are represented as *cards* below. Click on the various card items
to expand sub-sections, open values or references, hide and show compartments, or
collapse cards again. The highlighted *main* card cannot be collapsed. The
shapes in the background represent section containment (grey) and
reference (blue) relations.

If you bookmark this page, you can save the definition represented by the highlighted
*main* card.

To learn more about the meta-info, visit the [meta-info homepage](https://metainfo.nomad-coe.eu/nomadmetainfo_public/archive.html).
`
const ITEM_HEIGHT = 48
const ITEM_PADDING_TOP = 8
const MenuProps = {
  PaperProps: {
    style: {
      maxHeight: ITEM_HEIGHT * 4.5 + ITEM_PADDING_TOP,
      width: 300, maxHeight: '90vh'
    }
  }
}

class MetaInfoBrowser extends Component {
  static propTypes = {
    classes: PropTypes.object.isRequired,
    metainfo: PropTypes.string,
    api: PropTypes.object.isRequired,
    loading: PropTypes.number,
    raiseError: PropTypes.func.isRequired,
    history: PropTypes.object.isRequired
  }

  static styles = theme => ({
    root: {},
    forms: {
      padding: `${theme.spacing.unit * 3}px ${theme.spacing.unit * 3}px 0 ${theme.spacing.unit * 3}px`
    },
    packageSelect: {
      width: 300
    },
    search: {
      width: 450,
      marginRight: theme.spacing.unit * 2
    }
  })

  initialState = {
    domainRootSection: null,
    metainfos: null,
    allMetainfos: null,
    selectedPackage: null,
    loadedPackage: null
  }

  state = this.initialState

  constructor(props) {
    super(props)
    this.handleSelectedPackageChanged = this.handleSelectedPackageChanged.bind(this)
    this.handleSearch = this.handleSearch.bind(this)
  }

  update(pkg) {
    this.props.api.getInfo().then(info => {
      this.props.api.getMetaInfo(pkg || info.domain.metainfo.all_package).then(metainfos => {
        const metainfoName = this.props.metainfo || info.domain.metainfo.root_sections[0]
        const definition = metainfos.get(metainfoName)
        if (!definition) {
          this.props.history.push(`/metainfo/${info.domain.metainfo.root_sections[0]}`)
        } else {
          this.setState({loadedPackage: pkg, metainfos: metainfos})
        }
      }).catch(error => {
        this.props.raiseError(error)
      })
    }).catch(error => {
      this.props.raiseError(error)
    })
  }

  init() {
    this.props.api.getInfo().then(info => {
      this.props.api.getMetaInfo(info.domain.metainfo.all_package).then(metainfos => {
        const metainfoName = this.props.metainfo || info.domain.metainfo.root_sections[0]
        const definition = metainfos.get(metainfoName)
        this.setState({
          domainRootSection: info.domain.metainfo.root_sections[0],
          allMetainfos: metainfos,
          selectedPackage: definition.package.name})
        this.update(definition.package.name)
      }).catch(error => {
        this.props.raiseError(error)
      })
    }).catch(error => {
      this.props.raiseError(error)
    })
  }

  componentDidUpdate(prevProps) {
    if (this.props.metainfo !== prevProps.metainfo) {
      this.setState(this.initialState)
      this.init()
    }
  }

  componentDidMount() {
    this.init()
  }

  handleSelectedPackageChanged(event) {
    this.setState({selectedPackage: event.target.value})
    this.update(event.target.value)
  }

  handleSearch(term) {
    if (this.state.metainfos.get(term)) {
      this.props.history.push(`/metainfo/${term}`)
    }
  }

  render() {
    const { classes, loading } = this.props
    const { metainfos, selectedPackage, allMetainfos, loadedPackage, domainRootSection } = this.state

    if (!metainfos || !allMetainfos) {
      return <div />
    }

    const metainfoName = this.props.metainfo || domainRootSection || 'section_run'
    const metainfo = metainfos.resolve(metainfos.createProxy(metainfoName))

    return <div>
      <div className={classes.forms}>
        <form style={{ display: 'flex' }}>
          <MetainfoSearch
            classes={{container: classes.search}}
            suggestions={Object.values(metainfos.names).filter(metainfo => !schema.isPackage(metainfo))}
            onChange={this.handleSearch}
          />
          <FormControl disabled={loading > 0}>
            <InputLabel htmlFor="select-multiple-checkbox">Package</InputLabel>
            <Select
              classes={{root: classes.packageSelect}}
              value={selectedPackage}
              onChange={this.handleSelectedPackageChanged}
              input={<Input id="select-multiple-checkbox" />}
              MenuProps={MenuProps}
            >
              {allMetainfos.contents
                .map(pkg => pkg.name)
                .map(name => {
                  return <MenuItem key={name} value={name}>
                    <ListItemText primary={name.substring(0, name.length - 19)} />
                  </MenuItem>
                })
              }
            </Select>
          </FormControl>
        </form>
      </div>
      <Viewer key={loadedPackage} rootElement={metainfo} packages={metainfos.contents} />
    </div>
  }
}

export default compose(withRouter, withApi(false), withStyles(MetaInfoBrowser.styles))(MetaInfoBrowser)
