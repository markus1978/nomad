import React from 'react'
import PropTypes from 'prop-types'
import { withApi } from '../api'
import { isEquivalent } from '../../utils'
import { domains } from '../domains'

/**
 * A non visible component that keeps shared search state between all child components.
 */
class SearchContext extends React.Component {
  static propTypes = {
    query: PropTypes.object,
    initialQuery: PropTypes.object,
    initialRequest: PropTypes.object,
    update: PropTypes.number,
    api: PropTypes.object.isRequired,
    raiseError: PropTypes.func.isRequired,
    children: PropTypes.any,
    defaultDomain: PropTypes.object.isRequired
  }

  static emptyResponse = {
    statistics: {
      total: {
        all: {}
      }
    }
  }

  static type = React.createContext()

  constructor(props) {
    super(props)
    this.handleRequestChange = this.handleRequestChange.bind(this)
    this.handleQueryChange = this.handleQueryChange.bind(this)
    this.handleMetricChange = this.handleMetricChange.bind(this)
    this.handleDomainChange = this.handleDomainChange.bind(this)
    this.state.query = this.props.initialQuery || {}
    if (this.props.initialRequest) {
      this.state.request = {...this.state.request, ...this.props.initialRequest}
    }
  }

  defaultMetric = this.props.defaultDomain.defaultSearchMetric

  state = {
    response: SearchContext.emptyResponse,
    request: {
      statistics: true,
      order_by: 'upload_time',
      order: -1,
      page: 1,
      per_page: 10
    },
    metric: this.defaultMetric,
    usedMetric: this.defaultMetric,
    domain: this.props.defaultDomain,
    query: {}
  }

  handleRequestChange(changes) {
    this.setState({request: {...this.state.request, ...changes}})
  }

  handleQueryChange(changes, replace) {
    if (changes['dft.atoms'] && changes['dft.atoms'].length === 0) {
      changes['dft.atoms'] = undefined
    }
    if (changes['dft.only_atoms'] && changes['dft.only_atoms'].length === 0) {
      changes['dft.only_atoms'] = undefined
    }
    if (replace) {
      this.setState({query: changes})
    } else {
      this.setState({query: {...this.state.query, ...changes}})
    }
  }

  handleMetricChange(metric) {
    this.setState({metric: metric})
  }

  handleDomainChange(domain) {
    if (domain.key !== this.state.domain.key) {
      this.setState(
        {domain: domains[domain] || this.props.defaultDomain || domains.dft},
        () => this.update())
    }
  }

  update() {
    const {api, raiseError} = this.props
    const {request, query, metric, domain} = this.state
    const search = {
      ...request,
      ...query,
      domain: domain.key,
      metrics: metric === this.defaultMetric ? [] : [metric],
      ...(this.props.query || {})}

    api.search(search)
      .then(response => {
        // find the first statistic to determine which metric is used
        const {statistics} = response
        let usedMetric = this.defaultMetric
        const firstRealQuantitiy = Object.keys(statistics).find(key => key !== 'total')
        if (firstRealQuantitiy) {
          const firstValue = Object.keys(statistics[firstRealQuantitiy])[0]
          if (firstValue) {
            usedMetric = Object.keys(statistics[firstRealQuantitiy][firstValue])
              .find(metric => metric !== this.defaultMetric) || this.defaultMetric
          }
        }
        this.setState({response: response || SearchContext.emptyResponse, usedMetric: usedMetric})
      }).catch(error => {
        this.setState({response: SearchContext.emptyResponse})
        raiseError(error)
      })
  }

  componentDidMount() {
    this.update()
  }

  componentDidUpdate(prevProps, prevState) {
    const {query, request, metric} = this.state
    if (
      prevState.query !== query ||
        prevState.request !== request ||
        prevState.metric !== metric ||
        prevProps.update !== this.props.update ||
        !isEquivalent(prevProps.query || {}, this.props.query || {})) {
      this.update()
    }
  }

  render() {
    const {children} = this.props
    const value = {
      state: this.state,
      props: this.props,
      setRequest: this.handleRequestChange,
      setQuery: this.handleQueryChange,
      setMetric: this.handleMetricChange,
      setDomain: this.handleDomainChange
    }
    return <SearchContext.type.Provider value={value} >
      {children}
    </SearchContext.type.Provider>
  }
}

const withHoc = withApi(false, false)(SearchContext)
Object.assign(withHoc, {type: SearchContext.type})

export default withHoc
