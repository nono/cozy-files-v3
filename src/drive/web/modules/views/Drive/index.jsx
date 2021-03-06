/* global __TARGET__ */

import React, { useCallback, useContext } from 'react'
import { connect, useDispatch } from 'react-redux'
import get from 'lodash/get'
import uniqBy from 'lodash/uniqBy'

import { SharingContext } from 'cozy-sharing'
import { useQuery, useClient } from 'cozy-client'
import { useI18n } from 'cozy-ui/transpiled/react/I18n'
import useBreakpoints from 'cozy-ui/transpiled/react/hooks/useBreakpoints'

import Dropzone from 'drive/web/modules/upload/Dropzone'
import { ModalContext } from 'drive/lib/ModalContext'
import useActions from 'drive/web/modules/actions/useActions'
import {
  share,
  download,
  trash,
  open,
  rename,
  move,
  qualify,
  versions,
  offline,
  hr
} from 'drive/web/modules/actions'
import Toolbar from 'drive/web/modules/drive/Toolbar'
import { ROOT_DIR_ID } from 'drive/constants/config'
import MediaBackupProgression from 'drive/mobile/modules/mediaBackup/MediaBackupProgression'
import RatingModal from 'drive/mobile/modules/settings/RatingModal'
import FirstUploadModal from 'drive/mobile/modules/mediaBackup/FirstUploadModal'
import {
  buildDriveQuery,
  buildFileWithSpecificMetadataAttributeQuery
} from 'drive/web/modules/queries'
import {
  getCurrentFolderId,
  getDisplayedFolder
} from 'drive/web/modules/selectors'
import { useFolderSort } from 'drive/web/modules/navigation/duck'
import { useExtraColumns } from 'drive/web/modules/certifications/useExtraColumns'
import { makeExtraColumnsNamesFromMedia } from 'drive/web/modules/certifications'

import FolderView from '../Folder/FolderView'
import FolderViewHeader from '../Folder/FolderViewHeader'
import FolderViewBody from '../Folder/FolderViewBody'
import FolderViewBreadcrumb from '../Folder/FolderViewBreadcrumb'

import { useTrashRedirect } from './useTrashRedirect'

const getBreadcrumbPath = (t, displayedFolder) =>
  uniqBy(
    [
      {
        id: ROOT_DIR_ID
      },
      {
        id: get(displayedFolder, 'dir_id')
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
      name:
        breadcrumb.name ||
        (breadcrumb.id === ROOT_DIR_ID ? t('breadcrumb.title_drive') : '…')
    }))

const desktopExtraColumnsNames = ['carbonCopy', 'electronicSafe']
const mobileExtraColumnsNames = []

const DriveView = ({
  currentFolderId,
  router,
  location,
  children,
  displayedFolder
}) => {
  const { isMobile } = useBreakpoints()

  const extraColumnsNames = makeExtraColumnsNamesFromMedia({
    isMobile,
    desktopExtraColumnsNames,
    mobileExtraColumnsNames
  })

  const extraColumns = useExtraColumns({
    columnsNames: extraColumnsNames,
    queryBuilder: buildFileWithSpecificMetadataAttributeQuery,
    currentFolderId
  })

  useTrashRedirect(displayedFolder)

  const [sortOrder] = useFolderSort(currentFolderId)

  const folderQuery = buildDriveQuery({
    currentFolderId,
    type: 'directory',
    sortAttribute: sortOrder.attribute,
    sortOrder: sortOrder.order
  })
  const fileQuery = buildDriveQuery({
    currentFolderId,
    type: 'file',
    sortAttribute: sortOrder.attribute,
    sortOrder: sortOrder.order
  })

  const foldersResult = useQuery(folderQuery.definition, folderQuery.options)
  const filesResult = useQuery(fileQuery.definition, fileQuery.options)

  const allResults = [foldersResult, filesResult]

  const isInError = allResults.some(result => result.fetchStatus === 'failed')
  const isLoading = allResults.some(
    result => result.fetchStatus === 'loading' && !result.lastUpdate
  )
  const isPending = allResults.some(result => result.fetchStatus === 'pending')

  const navigateToFolder = useCallback(
    folderId => {
      router.push(`/folder/${folderId}`)
    },
    [router]
  )

  const navigateToFile = useCallback(
    file => {
      router.push(`/folder/${currentFolderId}/file/${file.id}`)
    },
    [router, currentFolderId]
  )

  const { hasWriteAccess } = useContext(SharingContext)
  const client = useClient()
  const { pushModal, popModal } = useContext(ModalContext)
  const { refresh } = useContext(SharingContext)
  const dispatch = useDispatch()
  const canWriteToCurrentFolder = hasWriteAccess(currentFolderId)
  const actionsOptions = {
    client,
    pushModal,
    popModal,
    refresh,
    dispatch,
    router,
    location,
    hasWriteAccess: canWriteToCurrentFolder,
    canMove: true
  }
  const actions = useActions(
    [
      share,
      download,
      hr,
      qualify,
      rename,
      move,
      hr,
      offline,
      open,
      versions,
      hr,
      trash
    ],
    actionsOptions
  )

  const { t } = useI18n()
  const geTranslatedBreadcrumbPath = useCallback(
    displayedFolder => getBreadcrumbPath(t, displayedFolder),
    [t]
  )

  return (
    <FolderView>
      <FolderViewHeader>
        {currentFolderId && (
          <FolderViewBreadcrumb
            getBreadcrumbPath={geTranslatedBreadcrumbPath}
            currentFolderId={currentFolderId}
            navigateToFolder={navigateToFolder}
          />
        )}
        <Toolbar
          canUpload={true}
          canCreateFolder={true}
          disabled={isLoading || isInError || isPending}
        />
      </FolderViewHeader>
      {__TARGET__ === 'mobile' && (
        <div>
          {currentFolderId === ROOT_DIR_ID && <MediaBackupProgression />}
          <FirstUploadModal />
          <RatingModal />
        </div>
      )}
      <Dropzone
        role="main"
        disabled={__TARGET__ === 'mobile' || !canWriteToCurrentFolder}
        displayedFolder={displayedFolder}
      >
        <FolderViewBody
          navigateToFolder={navigateToFolder}
          navigateToFile={navigateToFile}
          actions={actions}
          queryResults={[foldersResult, filesResult]}
          canSort
          currentFolderId={currentFolderId}
          extraColumns={extraColumns}
        />
        {children}
      </Dropzone>
    </FolderView>
  )
}

export default connect(state => ({
  currentFolderId: getCurrentFolderId(state) || ROOT_DIR_ID,
  displayedFolder: getDisplayedFolder(state)
}))(DriveView)
