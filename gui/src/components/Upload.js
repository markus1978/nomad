import React from 'react';
import PropTypes from 'prop-types';
import { Link } from 'react-router-dom';
import { withStyles, ExpansionPanel, ExpansionPanelSummary, Typography, ExpansionPanelDetails, Stepper, Step, StepLabel, Table, TableRow, TableCell, IconButton, MuiThemeProvider, TableBody } from '@material-ui/core';
import ExpandMoreIcon from '@material-ui/icons/ExpandMore';
import RepoIcon from '@material-ui/icons/Cloud';
import ArchiveIcon from '@material-ui/icons/Storage';
import EncIcon from '@material-ui/icons/Assessment';
import ReactJson from 'react-json-view'
import { repoTheme, encTheme, archiveTheme } from '../config';


class Upload extends React.Component {
  static propTypes = {
    classes: PropTypes.object.isRequired,
    upload: PropTypes.object.isRequired
  }
  static styles = theme => ({
      root: {},
      heading: {
        fontSize: theme.typography.pxToRem(15),
        fontWeight: theme.typography.fontWeightRegular,
      },
      details: {
        padding: 0,
        display: 'block',
      },
      detailsContent: {
        margin: theme.spacing.unit * 3
      },
      title: {
        flexBasis: '20%',
        flexShrink: 0,
        marginRight: theme.spacing.unit * 2
      },
      stepper: {
        width: '100%',
        padding: 0
      },
      buttonCell: {
        overflow: 'hidden',
        whiteSpace: 'nowrap',
        textAlign: 'right'
      }
  });

  constructor(props) {
    super(props)
    this.state = {
      upload: props.upload
    }
  }

  updateUpload() {
    window.setTimeout(() => {
      this.state.upload.update()
        .then(upload => {
          console.debug(`Sucessfully updated upload ${upload.upload_id}.`)
          console.assert(upload.proc, 'Uploads always must have a proc')
          this.setState({upload: upload})
          if (upload.proc.status !== 'SUCCESS') {
            this.updateUpload()
          }
        })
    }, 500)
  }

  componentDidMount() {
    this.updateUpload()
  }

  renderTitle() {
    const { classes } = this.props
    const { name, upload_id, create_time } = this.state.upload

    return (
      <div className={classes.title}>
        <Typography variant="title">
          {name || upload_id}
        </Typography>
        <Typography variant="subheading">
          {new Date(Date.parse(create_time)).toLocaleString()}
        </Typography>
      </div>
    )
  }

  renderStepper() {
    const { classes } = this.props
    const { calc_procs, task_names, current_task_name, status } = this.state.upload.proc

    let activeStep = task_names.indexOf(current_task_name)
    activeStep += (status === 'SUCCESS') ? 1 : 0

    return (
      <Stepper activeStep={activeStep} classes={{root: classes.stepper}}>
        {task_names.map((label, index) => {
          let optional = null;
          if (task_names[index] === 'parse_all') {
            label = 'parse'
            if (calc_procs.length > 0) {
              optional = (
                <Typography variant="caption">
                  {calc_procs.filter(p => p.status === 'SUCCESS').length}/{calc_procs.length}
                </Typography>
              );
            }
          }
          return (
            <Step key={label}>
              <StepLabel optional={optional}>{label}</StepLabel>
            </Step>
          )
        })}
      </Stepper>
    )
  }

  renderCalcTable() {
    const { classes } = this.props
    const { calc_procs } = this.state.upload.proc

    if (calc_procs.length === 0) {
      return (
        <Typography className={classes.detailsContent}>
          No calculcations found.
        </Typography>
      )
    }

    const renderRow = (calcProc, index) => {
      const { mainfile, calc_hash, parser_name, task_names, current_task_name, archive_id } = calcProc
      return (
        <TableRow key={index}>
          <TableCell>
            <Typography>
              {mainfile}
            </Typography>
            <Typography variant="caption">
              {calc_hash}
            </Typography>
          </TableCell>
          <TableCell>
            <Typography>
              {parser_name.replace('parsers/', '')}
            </Typography>
          </TableCell>
          <TableCell>
            <Typography>
              {current_task_name}
            </Typography>
            <Typography variant="caption">
              task&nbsp;
              <b>
                [{task_names.indexOf(current_task_name) + 1}/{task_names.length}]
              </b>
            </Typography>
          </TableCell>
          <TableCell className={classes.buttonCell}>
            <MuiThemeProvider theme={repoTheme}>
              <IconButton color="primary" component={Link} to={`/repo/${archive_id}`}><RepoIcon /></IconButton>
            </MuiThemeProvider>
            <MuiThemeProvider theme={archiveTheme}>
              <IconButton color="primary" component={Link} to={`/archive/${archive_id}`}><ArchiveIcon /></IconButton>
            </MuiThemeProvider>
            <MuiThemeProvider theme={encTheme}>
              <IconButton color="primary" component={Link} to={`/enc/${archive_id}`}><EncIcon /></IconButton>
            </MuiThemeProvider>
          </TableCell>
        </TableRow>
      )
    }

    return (
      <Table>
        <TableBody>
          {calc_procs.map(renderRow)}
        </TableBody>
      </Table>
    )
  }

  render() {
    const { classes } = this.props;
    const { upload } = this.state;

    return (
      <ExpansionPanel>
        <ExpansionPanelSummary expandIcon={<ExpandMoreIcon/>}>
          {this.renderTitle()} {this.renderStepper()}
        </ExpansionPanelSummary>
        <ExpansionPanelDetails style={{width: '100%'}} classes={{root: classes.details}}>
          {this.renderCalcTable()}
          <div className={classes.detailsContent}>
            <ReactJson src={upload} enableClipboard={false} collapsed={1} />
          </div>
        </ExpansionPanelDetails>
      </ExpansionPanel>
    )
  }
}

export default withStyles(Upload.styles)(Upload);