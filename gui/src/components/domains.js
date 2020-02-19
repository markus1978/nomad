import React from 'react'
import PropTypes from 'prop-types'
import DFTSearchAggregations from './dft/DFTSearchAggregations'
import DFTEntryOverview from './dft/DFTEntryOverview'
import DFTEntryCards from './dft/DFTEntryCards'
import EMSSearchAggregations from './ems/EMSSearchAggregations'
import EMSEntryOverview from './ems/EMSEntryOverview'
import EMSEntryCards from './ems/EMSEntryCards'

const DomainContext = React.createContext()

export class DomainProvider extends React.Component {
  static propTypes = {
    children: PropTypes.oneOfType([
      PropTypes.arrayOf(PropTypes.node),
      PropTypes.node
    ]).isRequired
  }

  domains = {
    entryLabel: 'entry',
    dft: {
      name: 'DFT',
      about: 'This include data from many computational material science codes',
      entryLabel: 'entry',
      entryLabelPlural: 'entries',
      searchPlaceholder: 'enter atoms, codes, functionals, or other quantity values',
      /**
       * A component that is used to render the search aggregations. The components needs
       * to work with props: aggregations (the aggregation data from the api),
       * searchValues (currently selected search values), metric (the metric key to use),
       * onChange (callback to propagate searchValue changes).
       */
      SearchAggregations: DFTSearchAggregations,
      /**
       * Metrics are used to show values for aggregations. Each metric has a key (used
       * for API calls), a label (used in the select form), and result string (to show
       * the overall amount in search results).
       */
      searchMetrics: {
        code_runs: {
          label: 'Entries',
          tooltip: 'The statistics will show the number of database entry. Each set of input/output files that represents a code run is an entry.',
          renderResultString: count => (<span><b>{count.toLocaleString()}</b> entr{count === 1 ? 'y' : 'ies'}</span>)
        },
        unique_entries: {
          label: 'Unique entries',
          tooltip: 'Counts duplicates only once.',
          renderResultString: count => (<span> and <b>{count.toLocaleString()}</b> unique entr{count === 1 ? 'y' : 'ies'}</span>)
        },
        // total_energies: {
        //   label: 'Total energy calculations',
        //   tooltip: 'Aggregates the number of total energy calculations as each entry can contain many calculations.',
        //   renderResultString: count => (<span> with <b>{count.toLocaleString()}</b> total energy calculation{count === 1 ? '' : 's'}</span>)
        // },
        calculations: {
          label: 'Single configuration calculations',
          shortLabel: 'SCC',
          tooltip: 'Aggregates the number of single configuration calculations (e.g. total energy calculations) as each entry can contain many calculations.',
          renderResultString: count => (<span> with <b>{count.toLocaleString()}</b> single configuration calculation{count === 1 ? '' : 's'}</span>)
        },
        // The unique_geometries search aggregates unique geometries based on 10^8 hashes.
        // This takes to long in elastic search for a reasonable user experience.
        // Therefore, we only support geometries without uniqueness check
        geometries: {
          label: 'Geometries',
          shortLabel: 'Geometries',
          tooltip: 'Aggregates the number of simulated system geometries in all entries.',
          renderResultString: count => (<span> that simulate <b>{count.toLocaleString()}</b> unique geometrie{count === 1 ? '' : 's'}</span>)
        },
        datasets: {
          label: 'Datasets',
          tooltip: 'Shows statistics in terms of datasets that entries belong to.',
          renderResultString: count => (<span> curated in <b>{count.toLocaleString()}</b> dataset{count === 1 ? '' : 's'}</span>)
        }
      },
      defaultSearchMetric: 'code_runs',
      additionalSearchKeys: {
        raw_id: {},
        external_id: {},
        upload_id: {},
        calc_id: {},
        paths: {},
        pid: {},
        mainfile: {},
        calc_hash: {},
        formula: {},
        optimade: {},
        quantities: {},
        spacegroup: {},
        spacegroup_symbol: {},
        labels: {},
        upload_name: {}
      },
      /**
       * An dict where each object represents a column. Possible keys are label, render.
       * Default render
       */
      searchResultColumns: {
        formula: {
          label: 'Formula',
          supportsSort: true
        },
        code_name: {
          label: 'Code',
          supportsSort: true
        },
        basis_set: {
          label: 'Basis set',
          supportsSort: true
        },
        xc_functional: {
          label: 'XT treatment',
          supportsSort: true
        },
        system: {
          label: 'System',
          supportsSort: true
        },
        crystal_system: {
          label: 'Crystal system',
          supportsSort: true
        },
        spacegroup_symbol: {
          label: 'Spacegroup',
          supportsSort: true
        },
        spacegroup: {
          label: 'Spacegroup (number)',
          supportsSort: true
        }
      },
      defaultSearchResultColumns: ['formula', 'code_name', 'system', 'crystal_system', 'spacegroup_symbol'],
      /**
       * A component to render the domain specific quantities in the metadata card of
       * the entry view. Needs to work with props: data (the entry data from the API),
       * loading (a bool with api loading status).
       */
      EntryOverview: DFTEntryOverview,
      /**
       * A component to render additional domain specific cards in the
       * the entry view. Needs to work with props: data (the entry data from the API),
       * loading (a bool with api loading status).
       */
      EntryCards: DFTEntryCards
    },
    ems: {
      name: 'EMS',
      about: 'This is metadata from material science experiments',
      entryLabel: 'experiment',
      entryLabelPlural: 'experiments',
      searchPlaceholder: 'enter atoms, experimental methods, or other quantity values',
      /**
       * A component that is used to render the search aggregations. The components needs
       * to work with props: aggregations (the aggregation data from the api),
       * searchValues (currently selected search values), metric (the metric key to use),
       * onChange (callback to propagate searchValue changes).
       */
      SearchAggregations: EMSSearchAggregations,
      /**
       * Metrics are used to show values for aggregations. Each metric has a key (used
       * for API calls), a label (used in the select form), and result string (to show
       * the overall amount in search results).
       */
      searchMetrics: {
        code_runs: {
          label: 'Entries',
          tooltip: 'Statistics will show the number of database entry. Usually each entry represents a single experiment.',
          renderResultString: count => (<span><b>{count}</b> entries</span>)
        },
        datasets: {
          label: 'Datasets',
          tooltip: 'Shows statistics in terms of datasets that entries belong to.',
          renderResultString: count => (<span> curated in <b>{count}</b> datasets</span>)
        }
      },
      defaultSearchMetric: 'code_runs',
      /**
       * An dict where each object represents a column. Possible keys are label, render.
       * Default render
       */
      searchResultColumns: {
        formula: {
          label: 'Formula'
        },
        method: {
          label: 'Method'
        },
        experiment_location: {
          label: 'Location'
        },
        experiment_time: {
          label: 'Date/Time',
          render: time => time !== 'unavailable' ? new Date(time * 1000).toLocaleString() : time
        }
      },
      /**
       * A component to render the domain specific quantities in the metadata card of
       * the entry view. Needs to work with props: data (the entry data from the API),
       * loading (a bool with api loading status).
       */
      EntryOverview: EMSEntryOverview,
      /**
       * A component to render additional domain specific cards in the
       * the entry view. Needs to work with props: data (the entry data from the API),
       * loading (a bool with api loading status).
       */
      EntryCards: EMSEntryCards
    }
  }

  render() {
    return (
      <DomainContext.Provider value={{domains: this.domains}}>
        {this.props.children}
      </DomainContext.Provider>
    )
  }
}

export function withDomain(Component) {
  function DomainConsumer(props) {
    return (
      <DomainContext.Consumer>
        {state => <Component {...state} {...props}/>}
      </DomainContext.Consumer>
    )
  }

  return DomainConsumer
}
