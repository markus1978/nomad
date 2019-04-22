import React from 'react'
import PropTypes from 'prop-types'
import { withStyles } from '@material-ui/core/styles'
import { Paper, Typography, Link } from '@material-ui/core'
import { schema } from '../MetaInfoRepository'
import ReactJson from 'react-json-view'
import { Card, CardButton, CardCompartment, PopoverCardButton } from './util/cards'
import Markdown from '../Markdown'

export function renderName(element) {
  let name = element ? element.name : '<unknown>'
  if (schema.isSection(element)) {
    name = name.replace(/^section_/gi, '')
  }
  return name.replace(/_/gi, ' ')
}

class DefinitionCardUnstyled extends React.Component {
  static propTypes = {
    classes: PropTypes.object.isRequired,
    definition: PropTypes.object.isRequired,
    current: PropTypes.object.isRequired,
    children: PropTypes.any,
    isVisible: PropTypes.func.isRequired,
    toggleDefinition: PropTypes.func.isRequired
  }
  static styles = (theme) => ({
    root: {
      width: 300,
      position: 'relative',
      zIndex: 1
    },
    current: {
      background: theme.palette.primary.light
    },
    type: {

    },
    buttons: {
      display: 'flex'
    },
    left: {

    },
    center: {
      flexGrow: 1,
      display: 'inherit',
      '& div': {
        marginRight: 'auto',
        marginLeft: 'auto'
      }
    },
    right: {

    },
    description: {
      display: 'inline'
    },
    descriptionParagraph: {
      marginTop: theme.spacing.unit,
      '&:first-child': {
        marginTop: 0
      }
    },
    source: {
      margin: theme.spacing.unit,
      maxWidth: 700
    }
  })
  constructor(props) {
    super(props)
    this.renderDescription = this.renderDescription.bind(this)
  }

  isParentOfCurrent = () => schema.isParent(this.props.current, this.props.definition)

  currentIsParentOfThis = () => schema.isParent(this.props.definition, this.props.current)

  isCurrent = () => this.props.definition === this.props.current

  isClosable = () => !this.isCurrent()

  render() {
    const {classes, definition, current, isVisible, toggleDefinition} = this.props
    const inherited = {...this.props, classes: undefined}
    const parentIsVisible = isVisible(definition.parent)
    return (
      <Paper className={classes.root}>
        <Card {...inherited} classes={{header: current === definition ? classes.current : ''}}>
          {definition.parent && (this.isCurrent() || this.isParentOfCurrent())
            ? <CardButton icon={parentIsVisible ? 'keyboard_tab' : 'keyboard_backspace'}
              size="tiny" position="left"
              onClick={() => toggleDefinition(definition.parent, !parentIsVisible)}/>
            : ''
          }
          <CardButton position="center" size="tiny" icon="launch" component={Link}
            to={`/metainfo/${definition.name}`} />
          <PopoverCardButton position="center" icon="code" classes={{content: classes.source}} size="tiny">
            <ReactJson src={definition.miJson} />
          </PopoverCardButton>
          {definition.problems.length > 0
            ? <PopoverCardButton position="center" icon="report_problem" color='secondary' size="tiny"
              classes={{content: classes.source}}>
              <ReactJson src={definition.problems} />
            </PopoverCardButton> : ''
          }
          {this.isClosable() ? <CardButton position="right" icon="cancel" onClick={() => toggleDefinition(definition, false)} /> : ''}
          <CardCompartment padded compId="title">
            <Typography variant="h6" component="h2">
              {renderName(this.props.definition)}
            </Typography>
            <Typography className={classes.type} color="textSecondary">
              {definition.mType}
            </Typography>
          </CardCompartment>
          <CardCompartment label="description" compId="description" padded foldable folded>
            {this.renderDescription(definition.description)}
          </CardCompartment>
          {this.props.children}
        </Card>
      </Paper>
    )
  }

  renderDescription(description) {
    // const {classes} = this.props
    description = description.replace(/(([A-Za-z0-9]+_)+[A-Za-z0-9]+)/g, '`$1`')
    // const paragraph = (props) => (
    //   <Typography classes={{root: classes.descriptionParagraph}}>{props.children}</Typography>
    // )
    // // apply mono space to definition names and add invisible zero space to each _ to allow line breaks
    // const inlineCode = (props) => (
    //   <a href={`/${props.children}`} style={{fontFamily: 'RobotoMono, monospace', fontWeight: 'bold'}}>
    //     {props.children.replace(/_/g, `\u200B_`)}
    //   </a>
    // )
    return (
      <Markdown>{description}</Markdown>
      // <ReactMarkdown source={description} className={classes.description} renderers={{paragraph: paragraph, inlineCode: inlineCode}}/>
    )
  }
}

export const DefinitionCard = withStyles(DefinitionCardUnstyled.styles)(DefinitionCardUnstyled)