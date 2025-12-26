import { AppContext } from '../config'
import {
  QueryParams,
  OutputSchema as AlgoOutput,
} from '../lexicon/types/app/bsky/feed/getFeedSkeleton'
import * as cannect from './cannect'
import * as following from './following'

type AlgoHandler = (ctx: AppContext, params: QueryParams, viewerDid?: string) => Promise<AlgoOutput>

const algos: Record<string, AlgoHandler> = {
  [cannect.shortname]: cannect.handler,
  [following.shortname]: following.handler,
}

export default algos
