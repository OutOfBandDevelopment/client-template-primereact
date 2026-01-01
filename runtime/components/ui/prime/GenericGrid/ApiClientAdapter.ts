import { ISearchQueryBase } from '../Base/types';
import { IQueryableClient } from './interfaces';

/**
 * Adapter for existing API clients to work with the Generic Grid
 * Handles the transition between old and new API patterns
 */
export class ApiClientAdapter<TClient, TSearchQuery extends ISearchQueryBase, TModel> 
  implements IQueryableClient<any, any, TSearchQuery, TModel> {
  
  constructor(private ClientClass: new () => TClient) {}

  async Query(request: { body: TSearchQuery }): Promise<{ rows?: TModel[]; totalRowCount?: number }> {
    const client = new this.ClientClass();
    // Check if client has Query method (new API pattern)
    if ('Query' in client && typeof client.Query === 'function') {
      try {
        const result = await (client as any).Query(request);
        return result;
      } catch (error) {
        console.error(`❌ [ApiClientAdapter] Query method failed:`, error);
        throw error;
      }
    }
    
    // Fallback to query method (mixed patterns)
    if ('query' in client && typeof client.query === 'function') {
      try {
        const result = await (client as any).query(request);
        return result;
      } catch (error) {
        console.error(`❌ [ApiClientAdapter] query method failed:`, error);
        throw error;
      }
    }
    
    console.error(`❌ [ApiClientAdapter] No compatible method found on client:`, {
      clientName: this.ClientClass.name,
      hasQuery: 'Query' in client,
      hasquery: 'query' in client,
      queryType: typeof (client as any).Query,
      queryLowerType: typeof (client as any).query,
      clientMethods: Object.getOwnPropertyNames(client).filter(prop => typeof (client as any)[prop] === 'function')
    });
    
    throw new Error(`Client ${this.ClientClass.name} does not implement required Query method`);
  }
}