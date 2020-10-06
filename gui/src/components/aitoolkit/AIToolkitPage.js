import React, { useMemo } from 'react'
import { Typography, ExpansionPanel, ExpansionPanelSummary, ExpansionPanelDetails, makeStyles, Link, ExpansionPanelActions, Button, Grid, TextField } from '@material-ui/core'
import tutorials from '../../toolkitMetadata'
import ExpandMoreIcon from '@material-ui/icons/ExpandMore'
import Markdown from '../Markdown'
import { StringParam, useQueryParams, useQueryParam } from 'use-query-params'
import Autocomplete from '@material-ui/lab/Autocomplete'

const useStyles = makeStyles(theme => ({
  root: {
    margin: theme.spacing(3),
    width: '100%',
    marginLeft: 'auto',
    marginRight: 'auto',
    maxWidth: 1024
  },
  section: {
    marginTop: theme.spacing(3)
  },
  sectionTitle: {
    marginBottom: theme.spacing(1),
    marginLeft: theme.spacing(2)
  },
  tutorial: {

  },
  tutorialTitle: {
    fontWeight: 'bold'
  },
  tutorialDetails: {
    flexDirection: 'column',
    '& *': {
      marginTop: theme.spacing(1)
    },
    '& :first-child': {
      marginTop: -theme.spacing(2)
    }
  },
  link: {
    cursor: 'pointer'
  }
}))

export default function AIToolkitPage() {
  const classes = useStyles()
  const [expanded, setExpanded] = useQueryParam('expanded', StringParam)
  const [queryParameters, setQueryParameters] = useQueryParams({
    author: StringParam, keyword: StringParam, method: StringParam, filterString: StringParam
  })
  const emptyQuery = {
    author: null,
    keyword: null,
    method: null,
    filterString: null
  }

  const filter = tutorial => {
    const {author, keyword, method} = queryParameters
    if (author && tutorial.authors.indexOf(author) === -1) {
      return false
    }
    if (keyword && tutorial.labels.application_keyword.indexOf(keyword) === -1) {
      return false
    }
    if (method && tutorial.labels.data_analytics_method.indexOf(method) === -1) {
      return false
    }
    return true
  }

  const {sections, authors, keywords, methods} = useMemo(() => {
    const authors = {}
    const keywords = {}
    const methods = {}
    const sectionMap = tutorials.tutorials.reduce((sections, tutorial) => {
      tutorial.labels.application_section.forEach(sectionTitle => {
        sections[sectionTitle] = sections[sectionTitle] || {title: sectionTitle, tutorials: []}
        tutorial.key = tutorial.title.replace(/\W/gm, '_').toLowerCase()
        sections[sectionTitle].tutorials.push(tutorial)
        tutorial.authors.forEach(i => { authors[i] = i })
        tutorial.labels.application_keyword.forEach(i => { keywords[i] = i })
        tutorial.labels.data_analytics_method.forEach(i => { methods[i] = i })
      })
      return sections
    }, {})
    return {
      sections: Object.keys(sectionMap).map(key => sectionMap[key]).sort((a, b) => a.title.localeCompare(b.title)),
      authors: Object.keys(authors).sort(),
      keywords: Object.keys(keywords).sort(),
      methods: Object.keys(methods).sort()
    }
  }, [])

  console.log(sections)

  return <Grid container spacing={2} className={classes.root}>
    <Grid item xs={12}>
      <Markdown>{`
        # NOMAD Artificial Intelligence Toolkit

        We develop and implement methods that identify correlations and structure in big data
        of materials. This will enable scientists and engineers to decide which materials are
        useful for specific applications or which new materials should be the focus of future studies.
        The following tutorials are designed to get started with the AI Toolkit.

        To log in directly, click [here](https://analytics-toolkit.nomad-coe.eu/hub).
      `}</Markdown>
    </Grid>
    <Grid item xs={8}>
      {sections.map(section => (
        <div key={section.title} className={classes.section}>
          <Typography className={classes.sectionTitle}>{section.title}</Typography>
          <div>
            {section.tutorials.map(tutorial => {
              const key = tutorial.key
              return <ExpansionPanel
                key={key}
                disabled={!filter(tutorial)}
                expanded={expanded === key}
                onChange={() => setExpanded(expanded === key ? null : key)}
                className={classes.tutorial}
              >
                <ExpansionPanelSummary expandIcon={<ExpandMoreIcon />}>
                  <Typography className={classes.tutorialTitle}>{tutorial.title}</Typography>
                </ExpansionPanelSummary>
                <ExpansionPanelDetails className={classes.tutorialDetails}>
                  <Typography>
                    {tutorial.authors
                      .map(name => {
                        const label = name.split(',').reverse().join(' ')
                        return <Link
                          className={classes.link}
                          key={name}
                          onClick={() => setQueryParameters({
                            ...emptyQuery,
                            author: queryParameters.author === name ? null : name
                          })}
                        >
                          <i>{label}</i>
                        </Link>
                      }).reduce((prev, curr) => [prev, ', ', curr])
                    }
                  </Typography>
                  <Markdown>
                    {tutorial.description}
                  </Markdown>
                  <Typography>
                    <b>keywords</b>: {tutorial.labels.application_keyword
                      .map(keyword => (
                        <Link
                          className={classes.link}
                          key={keyword}
                          onClick={() => setQueryParameters({
                            ...emptyQuery,
                            keyword: queryParameters.keyword === keyword ? null : keyword
                          })}
                        >
                          {keyword}
                        </Link>
                      )).reduce((prev, curr) => [prev, ', ', curr])
                    }
                  </Typography>
                  <Typography>
                    <b>method</b>: {tutorial.labels.data_analytics_method
                      .map(method => (
                        <Link
                          className={classes.link}
                          key={method}
                          onClick={() => setQueryParameters({
                            ...emptyQuery,
                            method: queryParameters.method === method ? null : method
                          })}
                        >
                          {method}
                        </Link>
                      )).reduce((prev, curr) => [prev, ', ', curr])
                    }
                  </Typography>
                </ExpansionPanelDetails>
                <ExpansionPanelActions>
                  <Button color="primary" href={tutorial.link} target="tutorial">
                    open with login
                  </Button>
                  <Button color="primary" href={tutorial.link_public} target="tutorial">
                    open as guest
                  </Button>
                </ExpansionPanelActions>
              </ExpansionPanel>
            })}
          </div>
        </div>
      ))}
    </Grid>
    <Grid item xs={4}>
      <Autocomplete
        id="combo-box-demo"
        options={authors}
        getOptionLabel={option => option}
        style={{ width: '100%', marginBottom: 8 }}
        renderInput={params => (
          <TextField {...params} label="author" fullWidth />
        )}
        value={queryParameters.author}
        onChange={(_, value) => setQueryParameters({...emptyQuery, author: value})}
      />
      <Autocomplete
        id="combo-box-demo"
        options={keywords}
        getOptionLabel={option => option}
        style={{ width: '100%', marginBottom: 8 }}
        renderInput={params => (
          <TextField {...params} label="keyword" fullWidth />
        )}
        value={queryParameters.keyword}
        onChange={(_, value) => setQueryParameters({...emptyQuery, keyword: value})}
      />
      <Autocomplete
        id="combo-box-demo"
        options={methods}
        style={{ width: '100%', marginBottom: 8 }}
        renderInput={params => (
          <TextField {...params} label="method" fullWidth />
        )}
        value={queryParameters.method}
        onChange={(_, value) => setQueryParameters({...emptyQuery, method: value})}
      />
      {/* <TextField label="text filter" fullWidth /> */}
    </Grid>
  </Grid>
}