//@flow

import type {Stream} from 'most'

import {async as subject, type Subject} from 'most-subject'

import * as Carrier from '../carrier'
import type {Effect} from '../carrier/effect'
import {UniqGuard} from '../uniq'
import {type ID, createIDType, type SEQ, createSeq} from '../id'
import {effectFabric, eventFabric} from './fabric'
import type {Named, WithStateLink, Dispatcher, Emitter} from '../index.h'

const nextID = createIDType()

export class Store<State>
implements Named, WithStateLink<State>, Dispatcher {
  uniq = new UniqGuard
  scopeName: string[]
  * scope(): Iterable<string> {
    yield* this.scopeName
  }
  id: ID = nextID()
  seq: SEQ = createSeq()
  update$: Subject<$Exact<{
    state: State,
    data: Carrier.Carrier<any>
  }>> = subject()
  state$: Stream<State> = this.update$
    .map(({state}) => state)
    .multicast()
  getState(): Stream<State> {
    return this.state$
  }
  dispatch: Function
  dispatch$: Subject<any> = (() => {
    const subj = subject()
    subj.observe((e) => this.dispatch(e))
    return subj
  })()
  mergeEvents(emitter: Emitter) {
    // emitter.event$.observe(e => this.dispatch$.next(e))
    emitter.event$ = this.dispatch$
  }
  event<P>(
    description: string
  ): Carrier.Message<P, Carrier.Carrier<P>, State> {
    const result = eventFabric(description, this)
    return result
  }
  effect<Params, Done, Fail>(
    description: string
  ): Effect<Params, Done, Fail, State> {
    const result = effectFabric(
      description,
      this
    )
    result.scope = () => this.scope()
    return result
  }
  // epic
}

