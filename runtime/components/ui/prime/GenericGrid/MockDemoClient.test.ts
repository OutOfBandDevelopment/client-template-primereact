/**
 * @vitest-environment jsdom
 * @group unit
 */

import { describe, it, expect } from 'vitest';
import { MockDemoClient, type IDemoSearchQuery } from './MockDemoClient';

describe('MockDemoClient', () => {
  const client = new MockDemoClient();

  it('should return all mock data without filters', async () => {
    const request: { body: IDemoSearchQuery } = {
      body: {}
    };

    const result = await client.Query(request);
    
    expect(result.rows).toBeDefined();
    expect(result.rows!.length).toBeGreaterThan(0);
    expect(result.totalRowCount).toBeGreaterThan(0);
  });

  it('should filter by department', async () => {
    const request: { body: IDemoSearchQuery } = {
      body: {
        filter: {
          department: { eq: 'Engineering' }
        }
      }
    };

    const result = await client.Query(request);
    
    expect(result.rows).toBeDefined();
    expect(result.rows!.every(row => row.department === 'Engineering')).toBe(true);
  });

  it('should filter by active status', async () => {
    const request: { body: IDemoSearchQuery } = {
      body: {
        filter: {
          isActive: { eq: true }
        }
      }
    };

    const result = await client.Query(request);
    
    expect(result.rows).toBeDefined();
    expect(result.rows!.every(row => row.isActive === true)).toBe(true);
  });

  it('should search by term', async () => {
    const request: { body: IDemoSearchQuery } = {
      body: {
        searchTerm: 'john'
      }
    };

    const result = await client.Query(request);
    
    expect(result.rows).toBeDefined();
    expect(result.rows!.some(row => 
      row.name.toLowerCase().includes('john') ||
      row.email.toLowerCase().includes('john')
    )).toBe(true);
  });

  it('should sort by name descending', async () => {
    const request: { body: IDemoSearchQuery } = {
      body: {
        orderBy: {
          name: 'desc'
        }
      }
    };

    const result = await client.Query(request);
    
    expect(result.rows).toBeDefined();
    expect(result.rows!.length).toBeGreaterThan(1);
    
    // Check if sorted correctly
    for (let i = 0; i < result.rows!.length - 1; i++) {
      expect(result.rows![i].name >= result.rows![i + 1].name).toBe(true);
    }
  });

  it('should apply pagination', async () => {
    const request: { body: IDemoSearchQuery } = {
      body: {
        currentPage: 0,
        pageSize: 3
      }
    };

    const result = await client.Query(request);
    
    expect(result.rows).toBeDefined();
    expect(result.rows!.length).toBeLessThanOrEqual(3);
  });

  it('should filter by salary range', async () => {
    const request: { body: IDemoSearchQuery } = {
      body: {
        filter: {
          salary: { gte: 80000, lte: 100000 }
        }
      }
    };

    const result = await client.Query(request);
    
    expect(result.rows).toBeDefined();
    expect(result.rows!.every(row => row.salary >= 80000 && row.salary <= 100000)).toBe(true);
  });
});