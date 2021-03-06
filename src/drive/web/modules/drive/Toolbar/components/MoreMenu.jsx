import React, { useState, useCallback } from 'react'

import { MoreButton } from 'components/Button'
import { isMobileApp } from 'cozy-device-helper'
import ActionMenu from 'cozy-ui/transpiled/react/ActionMenu'
import withBreakpoints from 'cozy-ui/transpiled/react/helpers/withBreakpoints'
import { isIOSApp } from 'cozy-device-helper'

import InsideRegularFolder from 'drive/web/modules/drive/Toolbar/components/InsideRegularFolder'

import UploadItem from './UploadItem'
import DeleteItem from '../delete/DeleteItem'
import SelectableItem from '../selectable/SelectableItem'
import AddFolderItem from './AddFolderItem'
import CreateNoteItem from './CreateNoteItem'
import CreateShortcut from './CreateShortcut'
import DownloadButtonItem from './DownloadButtonItem'
import ShareItem from '../share/ShareItem'
import StartScanner from './StartScanner'
import ScanWrapper from './ScanWrapper'

const MoreMenu = ({
  isDisabled,
  canCreateFolder,
  canUpload,
  hasWriteAccess,
  breakpoints: { isMobile }
}) => {
  const [menuIsVisible, setMenuVisible] = useState(false)
  const anchorRef = React.createRef()

  const openMenu = useCallback(
    () => {
      if (window.StatusBar && isIOSApp()) {
        window.StatusBar.backgroundColorByHexString('#989AA0')
      }
      setMenuVisible(true)
    },
    [setMenuVisible]
  )
  const closeMenu = useCallback(
    () => {
      if (window.StatusBar && isIOSApp()) {
        window.StatusBar.backgroundColorByHexString('#FFFFFF')
      }
      setMenuVisible(false)
    },
    [setMenuVisible]
  )
  const toggleMenu = useCallback(
    () => {
      if (menuIsVisible) return closeMenu()
      openMenu()
    },
    [closeMenu, openMenu, menuIsVisible]
  )

  return (
    <div>
      <div ref={anchorRef}>
        <MoreButton onClick={toggleMenu} disabled={isDisabled} />
      </div>
      <ScanWrapper>
        {menuIsVisible && (
          <ActionMenu
            placement="bottom-end"
            anchorElRef={anchorRef}
            onClose={closeMenu}
            autoclose
          >
            {canCreateFolder && hasWriteAccess && <AddFolderItem />}
            {hasWriteAccess && <CreateNoteItem />}
            {hasWriteAccess && <CreateShortcut />}
            {canUpload &&
              hasWriteAccess && <UploadItem disabled={isDisabled} />}
            {isMobileApp() &&
              canUpload &&
              hasWriteAccess && (
                <StartScanner insideMoreMenu disabled={isDisabled} />
              )}
            {hasWriteAccess && <hr />}
            {isMobile && (
              <InsideRegularFolder>
                <ShareItem />
              </InsideRegularFolder>
            )}
            {!isMobileApp() && (
              <InsideRegularFolder>
                <DownloadButtonItem />
              </InsideRegularFolder>
            )}
            <SelectableItem />
            {hasWriteAccess && (
              <InsideRegularFolder>
                <hr />
                <DeleteItem />
              </InsideRegularFolder>
            )}
          </ActionMenu>
        )}
      </ScanWrapper>
    </div>
  )
}

export default withBreakpoints()(MoreMenu)
