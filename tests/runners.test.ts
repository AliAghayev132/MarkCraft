import { describe, expect, it } from 'vitest'

import { runnableLanguages, runnerFor, tailLimit } from '@shared'

describe('runnerFor', () => {
  it('finds a runner by language', () => {
    expect(runnerFor('python')).toMatchObject({ command: 'python', extension: 'py' })
    expect(runnerFor('javascript')).toMatchObject({ command: 'node', extension: 'js' })
  })

  it('accepts the common aliases', () => {
    expect(runnerFor('js')?.command).toBe('node')
    expect(runnerFor('py')?.command).toBe('python')
    expect(runnerFor('ps1')?.command).toBe('powershell')
  })

  it('ignores case and whitespace', () => {
    expect(runnerFor('  Python ')?.command).toBe('python')
  })

  it('has none for a language it cannot run', () => {
    for (const language of ['rust', 'c', 'sql', 'json', 'markdown', '']) {
      expect(runnerFor(language)).toBeNull()
    }
  })

  /*
   * The command is an executable name and the arguments are a list, never a
   * shell string — a fence whose language was `sh; rm -rf ~` must not become a
   * command line.
   */
  it('never yields anything a shell would interpret', () => {
    for (const language of runnableLanguages()) {
      const runner = runnerFor(language)!
      expect(runner.command).toMatch(/^[a-z0-9]+$/)
      expect(Array.isArray(runner.args)).toBe(true)
    }
  })

  it('refuses an injected language string', () => {
    expect(runnerFor('sh; rm -rf /')).toBeNull()
    expect(runnerFor('python && curl evil')).toBeNull()
  })
})

describe('runnableLanguages', () => {
  it('lists them without duplicates, in order', () => {
    const list = runnableLanguages()
    expect(list).toEqual([...new Set(list)].sort())
    expect(list).toContain('python')
  })
})

describe('tailLimit', () => {
  it('leaves short output alone', () => {
    expect(tailLimit('hello', 100)).toEqual({ text: 'hello', truncated: false })
  })

  /*
   * From the end: a program that printed a hundred thousand lines and then
   * failed put the reason last, and head-truncating hides exactly that.
   */
  it('keeps the end when it has to cut', () => {
    const long = `${'x'.repeat(100)}THE ERROR`
    const cut = tailLimit(long, 20)

    expect(cut.truncated).toBe(true)
    expect(cut.text.endsWith('THE ERROR')).toBe(true)
    expect(cut.text).toHaveLength(20)
  })

  it('handles an empty string', () => {
    expect(tailLimit('', 10)).toEqual({ text: '', truncated: false })
  })
})
