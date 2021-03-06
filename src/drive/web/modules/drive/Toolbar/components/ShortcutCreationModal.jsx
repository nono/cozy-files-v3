import React, { useState, useCallback, useEffect } from 'react'

import { useClient } from 'cozy-client'
import { isIOS } from 'cozy-device-helper'

import { useI18n } from 'cozy-ui/transpiled/react/I18n'
import { FixedDialog } from 'cozy-ui/transpiled/react/CozyDialogs'
import Button from 'cozy-ui/transpiled/react/Button'
import TextField from 'cozy-ui/transpiled/react/MuiCozyTheme/TextField'
import InputAdornment from '@material-ui/core/InputAdornment'
import Stack from 'cozy-ui/transpiled/react/Stack'
import Alerter from 'cozy-ui/transpiled/react/Alerter'

const ENTER_KEY = 13

const isURLValid = url => {
  try {
    new URL(url)
    return true
  } catch (e) {
    return false
  }
}

const makeURLValid = str => {
  if (isURLValid(str)) return str
  else if (isURLValid(`https://${str}`)) return `https://${str}`
  return false
}
const ShortcutCreationModal = ({ onClose, onCreated, displayedFolder }) => {
  const { t } = useI18n()
  const [filename, setFilename] = useState('')
  const [url, setUrl] = useState('')
  const client = useClient()

  const createShortcut = useCallback(
    async () => {
      if (!filename || !url) {
        Alerter.error(t('Shortcut.needs_info'))
        return
      }
      const makedURL = makeURLValid(url)
      if (!makedURL) {
        Alerter.error(t('Shortcut.url_badformat'))
        return
      }
      const data = {
        name: filename.endsWith('.url') ? filename : filename + '.url',
        dir_id: displayedFolder.id,
        url: makedURL
      }
      try {
        await client.collection('io.cozy.files.shortcuts').create(data)
        Alerter.success(t('Shortcut.created'))
        if (onCreated) onCreated()
        onClose()
      } catch (e) {
        Alerter.error(t('Shortcut.errored'))
      }
    },
    [client, filename, onClose, onCreated, t, url, displayedFolder]
  )

  const handleKeyDown = e => {
    if (e.keyCode === ENTER_KEY) {
      createShortcut()
    }
  }

  useEffect(() => {
    const timeout = setTimeout(() => {
      if (isIOS()) window.scrollTo(0, 0)
    }, 30)

    return () => clearTimeout(timeout)
  }, [])

  return (
    <FixedDialog
      onClose={onClose}
      title={t('Shortcut.title_modal')}
      opened={true}
      content={
        <Stack>
          <div>
            <TextField
              label={t('Shortcut.url')}
              id="shortcuturl"
              variant="outlined"
              onChange={e => setUrl(e.target.value)}
              onKeyDown={e => handleKeyDown(e)}
              fullWidth
              margin="normal"
              autoFocus
            />
          </div>
          <div>
            <TextField
              label={t('Shortcut.filename')}
              id="shortcutfilename"
              variant="outlined"
              onChange={e => setFilename(e.target.value)}
              fullWidth
              margin="normal"
              onKeyDown={e => handleKeyDown(e)}
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">.url</InputAdornment>
                )
              }}
            />
          </div>
        </Stack>
      }
      actions={
        <>
          <Button
            theme="secondary"
            onClick={onClose}
            label={t('Shortcut.cancel')}
          />
          <Button
            theme="primary"
            label={t('Shortcut.create')}
            onClick={createShortcut}
          />
        </>
      }
    />
  )
}

export default ShortcutCreationModal
