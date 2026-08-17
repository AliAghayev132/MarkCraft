// ── @lib ───────────────────────────────────────────────────────────────────
import { CheckCircle2, ExternalLink, KeyRound, Plus, RefreshCw, Trash2 } from '@icons'
import { useCallback, useEffect, useRef, useState } from '@lib/react'

// ── @shared ────────────────────────────────────────────────────────────────
import { AI_PROVIDERS, aiProvider, type AiProfile, type AiProviderId } from '@shared'

// ── @i18n ──────────────────────────────────────────────────────────────────
import { useT } from '@i18n'

// ── @services ──────────────────────────────────────────────────────────────
import { aiService, appService, toast, updateSettings } from '@services'

// ── @store ─────────────────────────────────────────────────────────────────
import { useAppSelector } from '@store'

// ── @ui ────────────────────────────────────────────────────────────────────
import { Button, Card, Field, IconButton, Input, Select, Switch, Textarea } from '@ui'

// ── @features ──────────────────────────────────────────────────────────────
import { SettingsRow } from '@features/settings'

// ── types ──────────────────────────────────────────────────────────────────
import type { SectionProps } from './types'

/**
 * Connecting a model the user already pays for.
 *
 * The screen is built around one honest admission: MarkCraft has no AI of its
 * own. Everything here is about someone else's endpoint — which one, which
 * model, and the key that authorises it — so the layout follows that order and
 * says out loud where the text goes.
 */
export function AiSection({ matches }: SectionProps): React.ReactElement {
  const t = useT()
  const ai = useAppSelector((state) => state.settings.values.ai)
  const [keyed, setKeyed] = useState<Record<string, boolean>>({})
  const [encryption, setEncryption] = useState(true)
  const [busy, setBusy] = useState<string | null>(null)
  const [models, setModels] = useState<Record<string, string[]>>({})

  /*
   * The key field saves when it loses focus, and the natural gesture is to
   * paste a key and click Test in one motion. The click and the save then race
   * across two IPC channels, and Test can reach main first — reporting "no key"
   * for a key the user just entered. Anything that needs the key waits on this.
   */
  const pendingKey = useRef<Promise<unknown>>(Promise.resolve())

  const refreshKeys = useCallback(async () => {
    const status = await aiService.keyStatus()
    setKeyed(Object.fromEntries(status.map((entry) => [entry.profileId, entry.hasKey])))
  }, [])

  useEffect(() => {
    void refreshKeys()
    void aiService.encryptionAvailable().then(setEncryption)
  }, [refreshKeys])

  const patchProfiles = (profiles: AiProfile[]): void => {
    void updateSettings({ ai: { profiles } })
  }

  const addProfile = (): void => {
    const preset = AI_PROVIDERS[0]
    const profile: AiProfile = {
      id: `p-${Date.now().toString(36)}`,
      name: preset.label,
      provider: preset.id,
      baseUrl: preset.baseUrl,
      model: preset.suggestedModel,
      temperature: 0.4,
      maxTokens: 4096
    }

    void updateSettings({
      ai: {
        profiles: [...ai.profiles, profile],
        // A first profile that is not selected would leave the feature looking
        // configured but doing nothing.
        activeProfileId: ai.activeProfileId ?? profile.id
      }
    })
  }

  const updateProfile = (id: string, patch: Partial<AiProfile>): void => {
    patchProfiles(ai.profiles.map((profile) => (profile.id === id ? { ...profile, ...patch } : profile)))
  }

  const removeProfile = (id: string): void => {
    const remaining = ai.profiles.filter((profile) => profile.id !== id)
    void updateSettings({
      ai: {
        profiles: remaining,
        activeProfileId: ai.activeProfileId === id ? (remaining[0]?.id ?? null) : ai.activeProfileId
      }
    }).then(refreshKeys)
  }

  const saveKey = (id: string, key: string): Promise<void> => {
    const write = (async () => {
      try {
        await aiService.setKey(id, key)
        await refreshKeys()
        toast.success(t('ai.keySaved'))
      } catch (error) {
        toast.error(t('ai.keyFailed'), error instanceof Error ? error.message : String(error))
      }
    })()

    pendingKey.current = write
    return write
  }

  const test = async (id: string): Promise<void> => {
    setBusy(id)
    await pendingKey.current
    const result = await aiService.test(id)
    setBusy(null)

    if (result.ok) toast.success(t('ai.testOk'), result.detail)
    else toast.error(t('ai.testFailed'), result.detail)
  }

  const loadModels = async (id: string): Promise<void> => {
    setBusy(id)
    await pendingKey.current
    try {
      const list = await aiService.listModels(id)
      setModels((current) => ({ ...current, [id]: list }))
      toast.success(t('ai.modelsLoaded', { count: list.length }))
    } catch (error) {
      toast.error(t('ai.modelsFailed'), error instanceof Error ? error.message : String(error))
    } finally {
      setBusy(null)
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <SettingsRow id="ai.enabled"
        highlighted={matches.has('ai.enabled')} label={t('settings.ai.enabled')} hint={t('settings.ai.enabledHint')}>
        <Switch
          checked={ai.enabled}
          onChange={(enabled) => void updateSettings({ ai: { enabled } })}
          aria-label={t('settings.ai.enabled')}
        />
      </SettingsRow>

      <SettingsRow
        id="ai.confirmBeforeRun"
        highlighted={matches.has('ai.confirmBeforeRun')}
        label={t('settings.ai.confirm')}
        hint={t('settings.ai.confirmHint')}
      >
        <Switch
          checked={ai.confirmBeforeRun}
          onChange={(confirmBeforeRun) => void updateSettings({ ai: { confirmBeforeRun } })}
          aria-label={t('settings.ai.confirm')}
        />
      </SettingsRow>

      <SettingsRow
        id="ai.activeProfileId"
        highlighted={matches.has('ai.activeProfileId')}
        label={t('settings.ai.active')}
        hint={t('settings.ai.activeHint')}
      >
        <Select
          value={ai.activeProfileId ?? ''}
          onChange={(activeProfileId) => void updateSettings({ ai: { activeProfileId } })}
          options={
            ai.profiles.length === 0
              ? [{ value: '', label: t('settings.ai.noProfiles') }]
              : ai.profiles.map((profile) => ({
                  value: profile.id,
                  label: profile.name || profile.model,
                  hint: aiProvider(profile.provider).label
                }))
          }
          disabled={ai.profiles.length === 0}
          aria-label={t('settings.ai.active')}
        />
      </SettingsRow>

      <SettingsRow
        id="ai.houseStyle"
        highlighted={matches.has('ai.houseStyle')}
        label={t('settings.ai.houseStyle')}
        hint={t('settings.ai.houseStyleHint')}
        layout="stacked"
      >
        <Textarea
          rows={3}
          value={ai.houseStyle}
          placeholder={t('settings.ai.houseStylePlaceholder')}
          onChange={(event) => void updateSettings({ ai: { houseStyle: event.target.value } })}
        />
      </SettingsRow>

      {!encryption ? (
        <p className="text-xs text-warning">{t('settings.ai.noEncryption')}</p>
      ) : null}

      <div className="flex items-center justify-between pt-2">
        <h3 className="text-sm font-medium text-ink">{t('settings.ai.models')}</h3>
        <Button variant="secondary" size="sm" icon={<Plus size={14} />} onClick={addProfile}>
          {t('settings.ai.addModel')}
        </Button>
      </div>

      {ai.profiles.length === 0 ? (
        <p className="text-xs text-ink-secondary">{t('settings.ai.emptyHint')}</p>
      ) : null}

      {ai.profiles.map((profile) => {
        const preset = aiProvider(profile.provider)
        const known = models[profile.id]

        return (
          <Card key={profile.id} className="flex flex-col gap-3 p-3">
            <div className="flex items-center gap-2">
              <Input
                value={profile.name}
                onChange={(event) => updateProfile(profile.id, { name: event.target.value })}
                aria-label={t('settings.ai.name')}
              />
              {ai.activeProfileId === profile.id ? (
                <CheckCircle2 size={16} className="flex-none text-success" />
              ) : null}
              <IconButton
                icon={<Trash2 size={14} />}
                label={t('common.remove')}
                size="sm"
                variant="danger"
                onClick={() => removeProfile(profile.id)}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Field label={t('settings.ai.provider')}>
                <Select
                  value={profile.provider}
                  onChange={(value) => {
                    const next = aiProvider(value as AiProviderId)
                    updateProfile(profile.id, {
                      provider: next.id,
                      baseUrl: next.baseUrl,
                      model: next.suggestedModel,
                      name: profile.name || next.label
                    })
                  }}
                  options={AI_PROVIDERS.map((entry) => ({ value: entry.id, label: entry.label }))}
                  aria-label={t('settings.ai.provider')}
                />
              </Field>

              <Field label={t('settings.ai.model')}>
                {known && known.length > 0 ? (
                  <Select
                    value={profile.model}
                    onChange={(model) => updateProfile(profile.id, { model })}
                    options={known.map((id) => ({ value: id, label: id }))}
                    aria-label={t('settings.ai.model')}
                  />
                ) : (
                  <Input
                    value={profile.model}
                    onChange={(event) => updateProfile(profile.id, { model: event.target.value })}
                    placeholder={preset.suggestedModel}
                    aria-label={t('settings.ai.model')}
                  />
                )}
              </Field>
            </div>

            <Field label={t('settings.ai.baseUrl')} hint={t('settings.ai.baseUrlHint')}>
              <Input
                value={profile.baseUrl}
                onChange={(event) => updateProfile(profile.id, { baseUrl: event.target.value })}
                placeholder={preset.baseUrl}
                aria-label={t('settings.ai.baseUrl')}
              />
            </Field>

            <div className="grid grid-cols-2 gap-3">
              <Field label={t('settings.ai.maxTokens')} hint={t('settings.ai.maxTokensHint')}>
                <Input
                  type="number"
                  min={64}
                  max={32000}
                  step={64}
                  value={String(profile.maxTokens)}
                  onChange={(event) =>
                    updateProfile(profile.id, { maxTokens: Number(event.target.value) })
                  }
                  aria-label={t('settings.ai.maxTokens')}
                />
              </Field>

              <Field label={t('settings.ai.temperature')} hint={t('settings.ai.temperatureHint')}>
                <Input
                  type="number"
                  min={0}
                  max={2}
                  step={0.1}
                  value={String(profile.temperature)}
                  onChange={(event) =>
                    updateProfile(profile.id, { temperature: Number(event.target.value) })
                  }
                  aria-label={t('settings.ai.temperature')}
                />
              </Field>
            </div>

            {preset.needsKey ? (
              <Field
                label={t('settings.ai.apiKey')}
                hint={keyed[profile.id] ? t('settings.ai.keyStored') : t('settings.ai.keyHint')}
              >
                <div className="flex items-center gap-2">
                  <Input
                    type="password"
                    defaultValue=""
                    placeholder={keyed[profile.id] ? '••••••••••••' : t('settings.ai.keyPlaceholder')}
                    aria-label={t('settings.ai.apiKey')}
                    onBlur={(event) => {
                      const value = event.target.value.trim()
                      if (value === '') return
                      event.target.value = ''
                      void saveKey(profile.id, value)
                    }}
                  />
                  <IconButton
                    icon={<KeyRound size={14} />}
                    label={t('settings.ai.forgetKey')}
                    size="sm"
                    disabled={!keyed[profile.id]}
                    onClick={() => void saveKey(profile.id, '')}
                  />
                  {preset.keyUrl ? (
                    <IconButton
                      icon={<ExternalLink size={14} />}
                      label={t('settings.ai.getKey')}
                      size="sm"
                      onClick={() => void appService.openExternal(preset.keyUrl as string)}
                    />
                  ) : null}
                </div>
              </Field>
            ) : null}

            <div className="flex items-center gap-2">
              <Button
                variant="secondary"
                size="sm"
                loading={busy === profile.id}
                onClick={() => void test(profile.id)}
              >
                {t('settings.ai.test')}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                icon={<RefreshCw size={14} />}
                loading={busy === profile.id}
                onClick={() => void loadModels(profile.id)}
              >
                {t('settings.ai.loadModels')}
              </Button>
              {ai.activeProfileId !== profile.id ? (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => void updateSettings({ ai: { activeProfileId: profile.id } })}
                >
                  {t('settings.ai.use')}
                </Button>
              ) : null}
            </div>
          </Card>
        )
      })}
    </div>
  )
}
