import React, { Component } from 'react'
import { combineReducers } from 'redux'
import { connect } from 'react-redux'
import SelectionBar from './SelectionBar'

// constants
const SELECT_ITEM = 'SELECT_ITEM'
const UNSELECT_ITEM = 'UNSELECT_ITEM'
const ADD_TO_SELECTION = 'ADD_TO_SELECTION'
const REMOVE_FROM_SELECTION = 'REMOVE_FROM_SELECTION'
const TOGGLE_SELECTION_BAR = 'TOGGLE_SELECTION_BAR'
const SHOW_SELECTION_BAR = 'SHOW_SELECTION_BAR'
const HIDE_SELECTION_BAR = 'HIDE_SELECTION_BAR'

// selectors
export const getSelected = state => state.selection.selected
export const isSelectionBarVisible = state =>
  state.selection.selected.length !== 0 || state.selection.isSelectionBarOpened

// actions
export const showSelectionBar = () => ({ type: SHOW_SELECTION_BAR })
export const hideSelectionBar = () => ({ type: HIDE_SELECTION_BAR })
export const toggleSelectionBar = () => ({ type: TOGGLE_SELECTION_BAR })
export const toggleItemSelection = (item, selected) => ({
  type: selected ? UNSELECT_ITEM : SELECT_ITEM,
  item
})
export const addToSelection = items => ({ type: ADD_TO_SELECTION, items })
export const removeFromSelection = items => ({
  type: REMOVE_FROM_SELECTION,
  items
})

// reducers
const selected = (state = [], action) => {
  if (action.meta && action.meta.cancelSelection) {
    return []
  }
  switch (action.type) {
    case SELECT_ITEM:
      return [...state, action.item]
    case UNSELECT_ITEM:
      return state.filter(i => i._id !== action.item.id)
    case ADD_TO_SELECTION:
      const selectedIds = state.map(i => i._id)
      const newItems = action.items.filter(
        i => selectedIds.indexOf(i._id) === -1
      )
      return [...state, ...newItems]
    case REMOVE_FROM_SELECTION:
      const itemIds = action.items.map(i => i._id)
      return state.filter(i => itemIds.indexOf(i._id) === -1)
    case HIDE_SELECTION_BAR:
      return []
    default:
      return state
  }
}

const isSelectionBarOpened = (state = false, action) => {
  if (action.meta && action.meta.cancelSelection) {
    return false
  }
  switch (action.type) {
    case TOGGLE_SELECTION_BAR:
      return !state
    case SHOW_SELECTION_BAR:
      return true
    case HIDE_SELECTION_BAR:
      return false
    default:
      return state
  }
}

export const reducer = combineReducers({
  selected,
  isSelectionBarOpened
})

class Selection extends Component {
  componentWillUnmount() {
    // console.log('unmount selection')
    // this.props.clear()
  }

  render() {
    const { children, actions } = this.props
    const {
      selected,
      active,
      toggle,
      select,
      unselect,
      clear,
      show
    } = this.props

    const selectionActions = {
      toggle,
      select,
      unselect,
      clear,
      show
    }

    if (!actions) {
      return children(selected, active, selectionActions)
    }

    const realActions =
      typeof actions === 'function' ? actions(selectionActions) : actions

    let checkedActions = {}
    Object.keys(realActions).map(k => {
      checkedActions[k] =
        typeof realActions[k] === 'function'
          ? { action: realActions[k] }
          : realActions[k]
    })
    return (
      <div>
        {active && <SelectionBar actions={checkedActions} />}
        {children(selected, active, {
          toggle,
          select,
          unselect,
          clear,
          show
        })}
      </div>
    )
  }
}

const mapStateToProps = (state, ownProps) => ({
  selected: getSelected(state),
  active: isSelectionBarVisible(state)
})

const mapDispatchToProps = (dispatch, ownProps) => ({
  toggle: (id, selected) => {
    dispatch(toggleItemSelection(id, selected))
  },
  select: ids => {
    dispatch(addToSelection(ids))
  },
  unselect: ids => {
    dispatch(removeFromSelection(ids))
  },
  clear: () => dispatch(hideSelectionBar()),
  show: () => dispatch(showSelectionBar())
})

export default connect(mapStateToProps, mapDispatchToProps)(Selection)
