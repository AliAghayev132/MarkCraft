import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

import {
  colourFor,
  CURSOR_COLOURS,
  fallbackName,
  IPC_EVENT_NAMES,
  livingParticipants,
  parseAddress,
  PRESENCE_TIMEOUT,
  SESSION_DEFAULT_PORT,
  type Participant
} from '@shared'

/**
 * The vocabulary two machines have to agree on.
 *
 * The transport is exercised for real by the live check; what is tested here is
 * everything that has to be true before a byte goes anywhere — because a
 * mistake in it looks, from the other end, exactly like a network problem.
 */

const person = (over: Partial<Participant> = {}): Participant => ({
  id: 'p1',
  name: 'Someone',
  colour: '4',
  cursor: null,
  selection: [],
  seenAt: 0,
  ...over
})

describe('addresses', () => {
  it('takes a plain address and fills in the port', () => {
    expect(parseAddress('192.168.1.24')).toEqual({
      host: '192.168.1.24',
      port: SESSION_DEFAULT_PORT
    })
  })

  it('takes an address with a port', () => {
    expect(parseAddress('192.168.1.24:9000')).toEqual({ host: '192.168.1.24', port: 9000 })
  })

  it('takes a machine name, because that is what people are told', () => {
    expect(parseAddress('nadirs-laptop')).toEqual({
      host: 'nadirs-laptop',
      port: SESSION_DEFAULT_PORT
    })
  })

  it('takes an IPv6 address in the brackets it needs', () => {
    expect(parseAddress('[fe80::1]:7351')).toEqual({ host: 'fe80::1', port: 7351 })
  })

  it('ignores the spaces around something pasted', () => {
    expect(parseAddress('  10.0.0.5:7351  ')).toEqual({ host: '10.0.0.5', port: 7351 })
  })

  it('refuses what is not an address', () => {
    for (const input of [
      '',
      '   ',
      'http://192.168.1.24',
      '192.168.1.24:0',
      '192.168.1.24:70000',
      '192.168.1.24:abc',
      'has spaces:7351'
    ]) {
      expect(parseAddress(input)).toBeNull()
    }
  })
})

describe('cursor colours', () => {
  it('gives the first six people six different colours', () => {
    const given = new Set(Array.from({ length: 6 }, (_, at) => colourFor(at)))
    expect(given.size).toBe(6)
  })

  it('comes round again rather than running out', () => {
    // Two people sharing a colour is worse than a session that refuses a
    // seventh, but only just — and refusing would be far worse than sharing.
    expect(colourFor(6)).toBe(colourFor(0))
    expect(colourFor(13)).toBe(colourFor(1))
  })

  it('uses the canvas own six, not a second palette', () => {
    for (const colour of CURSOR_COLOURS) {
      expect(['1', '2', '3', '4', '5', '6']).toContain(colour)
    }
  })
})

describe('who is still here', () => {
  it('keeps someone who has just been heard from', () => {
    const now = 1_000_000
    expect(livingParticipants([person({ seenAt: now })], now)).toHaveLength(1)
  })

  it('keeps someone through a brief silence', () => {
    const now = 1_000_000
    const recent = person({ seenAt: now - PRESENCE_TIMEOUT + 1000 })
    expect(livingParticipants([recent], now)).toHaveLength(1)
  })

  it('drops a cursor that has been abandoned', () => {
    const now = 1_000_000
    const stale = person({ seenAt: now - PRESENCE_TIMEOUT - 1 })
    expect(livingParticipants([stale], now)).toEqual([])
  })

  it('judges each person separately', () => {
    const now = 1_000_000
    const here = person({ id: 'a', seenAt: now })
    const gone = person({ id: 'b', seenAt: now - PRESENCE_TIMEOUT * 2 })

    expect(livingParticipants([here, gone], now).map((p) => p.id)).toEqual(['a'])
  })
})

describe('the name shown beside a cursor', () => {
  it('is the machine name, not an account name', () => {
    expect(fallbackName('nadirs-laptop')).toBe('nadirs-laptop')
  })

  it('falls back to something rather than an empty label', () => {
    expect(fallbackName('')).toBe('Someone')
    expect(fallbackName('   ')).toBe('Someone')
  })

  it('is cut short rather than stretching across the canvas', () => {
    expect(fallbackName('x'.repeat(200))).toHaveLength(40)
  })
})

describe('the push channels', () => {
  /*
   * The preload keeps a runtime list of the channels it will pass through, and
   * it used to be typed out by hand. A channel declared in the contract and
   * sent by main was refused at the bridge with nothing said anywhere — the
   * feature simply did not work, and the only symptom was silence. The list is
   * now derived from the contract; this is the check that it stays complete.
   */
  it('names every event the contract declares', () => {
    const declared = new Set<string>(IPC_EVENT_NAMES)

    // `IpcEvents` has no runtime form, so the contract's own source is the
    // reference — the same file, read rather than duplicated.
    const contract = readFileSync(
      join(__dirname, '..', 'src', 'shared', 'ipc-contract.ts'),
      'utf8'
    )
    const block = contract.slice(
      contract.indexOf('export interface IpcEvents'),
      contract.indexOf('export type IpcEventName')
    )

    const used = [...block.matchAll(/'(event:[\w]+)'/g)].map((match) => match[1])
    expect(used.length).toBeGreaterThan(5)

    for (const channel of used) expect(declared).toContain(channel)
  })

  it('is what the preload actually lets through', () => {
    const preload = readFileSync(join(__dirname, '..', 'src', 'preload', 'index.ts'), 'utf8')

    // Not a hand-written set of strings — that is the defect this covers.
    expect(preload).toContain('new Set<string>(IPC_EVENT_NAMES)')
    expect(preload).not.toMatch(/ALLOWED_EVENTS = new Set<string>\(\[/)
  })
})
