import React, { useState, useCallback, useContext } from 'react'
import { connect, useDispatch } from 'react-redux'
import { ModalManager } from 'react-cozy-helpers'
import get from 'lodash/get'
import uniqBy from 'lodash/uniqBy'

import { useClient, models } from 'cozy-client'
import { SharingContext } from 'cozy-sharing'
import { isMobileApp } from 'cozy-device-helper'
import { useI18n } from 'cozy-ui/transpiled/react/I18n'
import { Content, Overlay } from 'cozy-ui/transpiled/react'
import Alerter from 'cozy-ui/transpiled/react/Alerter'
import useBreakpoints from 'cozy-ui/transpiled/react/hooks/useBreakpoints'

import { ModalStack, ModalContext } from 'drive/lib/ModalContext'
import useActions from 'drive/web/modules/actions/useActions'
import Main from 'drive/web/modules/layout/Main'
import { download, trash, rename, versions } from 'drive/web/modules/actions'
import FolderViewHeader from '../Folder/FolderViewHeader'
import FolderViewBody from '../Folder/FolderViewBody'
import FolderViewBreadcrumb from '../Folder/FolderViewBreadcrumb'
import PublicToolbar from 'drive/web/modules/public/PublicToolbar'
import PublicViewer from 'drive/web/modules/viewer/PublicViewer'
import {
  getCurrentFolderId,
  getDisplayedFolder,
  getParentFolder
} from 'drive/web/modules/selectors'
import usePublicFilesQuery from './usePublicFilesQuery'
import usePublicWritePermissions from './usePublicWritePermissions'
import { hasMetadataAttribute } from 'drive/web/modules/drive/files'
import { useExtraColumns } from 'drive/web/modules/certifications/useExtraColumns'
import { makeExtraColumnsNamesFromMedia } from 'drive/web/modules/certifications'

const getBreadcrumbPath = (t, displayedFolder, parentFolder) =>
  uniqBy(
    [
      {
        id: get(parentFolder, 'id'),
        name: get(parentFolder, 'name')
      },
      {
        id: displayedFolder.id,
        name: displayedFolder.name
      }
    ],
    'id'
  )
    .filter(({ id }) => Boolean(id))
    .map(breadcrumb => ({
      id: breadcrumb.id,
      name: breadcrumb.name || '…'
    }))

const desktopExtraColumnsNames = ['carbonCopy', 'electronicSafe']
const mobileExtraColumnsNames = []

const PublicFolderView = ({
  currentFolderId,
  parentFolder,
  router,
  location,
  children
}) => {
  const client = useClient()
  const { isMobile } = useBreakpoints()

  const [viewerOpened, setViewerOpened] = useState(false)
  const [currentViewerIndex, setCurrentViewerIndex] = useState(null)

  const filesResult = usePublicFilesQuery(currentFolderId)
  const files = filesResult.data

  const extraColumnsNames = makeExtraColumnsNamesFromMedia({
    isMobile,
    desktopExtraColumnsNames,
    mobileExtraColumnsNames
  })

  const extraColumns = useExtraColumns({
    columnsNames: extraColumnsNames,
    conditionBuilder: ({ files, attribute }) =>
      files.some(file => hasMetadataAttribute({ file, attribute })),
    files
  })

  const viewableFiles = files.filter(f => f.type !== 'directory')

  const refreshFolderContent = () => filesResult.forceRefetch() // We don't have enough permissions to rely on the realtime notifications or on a cozy-client query to update the view when something changes, so we relaod the view instead

  const navigateToFolder = useCallback(
    folderId => {
      router.push(`/folder/${folderId}`)
    },
    [router]
  )

  const navigateToFile = async file => {
    const isNote = models.file.isNote(file)
    if (isNote) {
      try {
        const noteUrl = await models.note.fetchURL(client, file)
        const url = new URL(noteUrl)
        if (!isMobileApp()) {
          url.searchParams.set('returnUrl', window.location.href)
        }
        window.location.href = url.toString()
      } catch (e) {
        Alerter.error('alert.offline')
      }
    } else {
      showInViewer(file)
      setViewerOpened(true)
    }
  }

  const showInViewer = useCallback(
    file => {
      const currentIndex = viewableFiles.findIndex(f => f.id === file.id)
      setCurrentViewerIndex(currentIndex)

      const currentIndexInResults = files.findIndex(f => f.id === file.id)
      if (filesResult.hasMore && files.length - currentIndexInResults <= 5) {
        filesResult.fetchMore()
      }
    },
    [viewableFiles, files, filesResult]
  )

  const closeViewer = useCallback(() => setViewerOpened(false), [
    setViewerOpened
  ])

  const { hasWritePermissions } = usePublicWritePermissions()

  const { pushModal, popModal } = useContext(ModalContext)
  const { refresh } = useContext(SharingContext)
  const dispatch = useDispatch()

  const refreshAfterChange = () => {
    refresh()
    refreshFolderContent()
  }

  const actionOptions = {
    client,
    pushModal,
    popModal,
    refresh: refreshAfterChange,
    dispatch,
    router,
    location,
    hasWriteAccess: hasWritePermissions,
    canMove: false
  }
  const actions = useActions([download, trash, rename, versions], actionOptions)

  const { t } = useI18n()
  const geTranslatedBreadcrumbPath = useCallback(
    displayedFolder => getBreadcrumbPath(t, displayedFolder, parentFolder),
    [t, parentFolder]
  )
  return (
    <>
      <Main isPublic={true}>
        <ModalStack />
        <ModalManager />
        <PublicToolbar
          files={files}
          hasWriteAccess={hasWritePermissions}
          refreshFolderContent={refreshFolderContent}
        />
        <div className="u-pt-2">
          <FolderViewHeader>
            {currentFolderId && (
              <FolderViewBreadcrumb
                getBreadcrumbPath={geTranslatedBreadcrumbPath}
                currentFolderId={currentFolderId}
                navigateToFolder={navigateToFolder}
              />
            )}
          </FolderViewHeader>
          <Content>
            <FolderViewBody
              navigateToFolder={navigateToFolder}
              navigateToFile={navigateToFile}
              actions={actions}
              queryResults={[filesResult]}
              canSort={false}
              currentFolderId={currentFolderId}
              refreshFolderContent={refreshFolderContent}
              canUpload={hasWritePermissions}
              extraColumns={extraColumns}
            />
            {viewerOpened &&
              viewableFiles.length > 0 && (
                <Overlay>
                  <PublicViewer
                    files={viewableFiles}
                    currentIndex={currentViewerIndex}
                    onChangeRequest={showInViewer}
                    onCloseRequest={closeViewer}
                  />
                </Overlay>
              )}
            {children}
          </Content>
        </div>
      </Main>
    </>
  )
}

export default connect(state => {
  const displayedFolder = getDisplayedFolder(state)
  const parentDirId = get(displayedFolder, 'dir_id')
  return {
    currentFolderId: getCurrentFolderId(state),
    displayedFolder,
    parentFolder: getParentFolder(state, parentDirId)
  }
})(PublicFolderView)
