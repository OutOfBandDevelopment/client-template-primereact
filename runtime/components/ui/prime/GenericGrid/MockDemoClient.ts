import type { IQueryableClient } from './types';
import type { ISearchQueryBase } from '../Base/types';

/**
 * Mock data model for demo purposes
 */
export interface IDemoModel {
  id: number;
  name: string;
  email: string;
  department: string;
  position: string;
  salary: number;
  startDate: string;
  isActive: boolean;
  location: string;
  manager: string;
  skills: string[];
  rating: number;
}

/**
 * Mock filter interface for demo
 */
export interface IDemoFilter {
  name?: { eq?: string; neq?: string; contains?: string };
  email?: { eq?: string; contains?: string };
  department?: { eq?: string; in?: string[] };
  position?: { eq?: string; contains?: string };
  salary?: { eq?: number; gt?: number; gte?: number; lt?: number; lte?: number; range?: [number, number] };
  startDate?: { eq?: string; gt?: string; gte?: string; lt?: string; lte?: string; range?: [string, string] };
  isActive?: { eq?: boolean };
  location?: { eq?: string; in?: string[] };
  manager?: { eq?: string; contains?: string };
  rating?: { eq?: number; gt?: number; gte?: number; lt?: number; lte?: number; range?: [number, number] };
}

/**
 * Mock order by interface for demo
 */
export interface IDemoOrderBy {
  name?: 'asc' | 'desc';
  email?: 'asc' | 'desc';
  department?: 'asc' | 'desc';
  position?: 'asc' | 'desc';
  salary?: 'asc' | 'desc';
  startDate?: 'asc' | 'desc';
  location?: 'asc' | 'desc';
  manager?: 'asc' | 'desc';
  rating?: 'asc' | 'desc';
}

/**
 * Mock search query interface for demo
 */
export interface IDemoSearchQuery extends ISearchQueryBase {
  filter?: IDemoFilter;
  orderBy?: IDemoOrderBy;
}

/**
 * Mock client that implements the IQueryable interface for demo purposes
 */
export class MockDemoClient implements IQueryableClient<IDemoFilter, IDemoOrderBy, IDemoSearchQuery, IDemoModel> {
  private static readonly MOCK_DATA: IDemoModel[] = [
    {
      id: 1,
      name: 'John Smith',
      email: 'john.smith@example.com',
      department: 'Engineering',
      position: 'Senior Software Engineer',
      salary: 95000,
      startDate: '2020-03-15',
      isActive: true,
      location: 'New York',
      manager: 'Sarah Johnson',
      skills: ['JavaScript', 'React', 'Node.js', 'TypeScript'],
      rating: 4.8
    },
    {
      id: 2,
      name: 'Emily Davis',
      email: 'emily.davis@example.com',
      department: 'Marketing',
      position: 'Marketing Manager',
      salary: 75000,
      startDate: '2019-07-22',
      isActive: true,
      location: 'Los Angeles',
      manager: 'Michael Brown',
      skills: ['SEO', 'Content Marketing', 'Analytics', 'Social Media'],
      rating: 4.6
    },
    {
      id: 3,
      name: 'Michael Chen',
      email: 'michael.chen@example.com',
      department: 'Engineering',
      position: 'Full Stack Developer',
      salary: 88000,
      startDate: '2021-01-10',
      isActive: true,
      location: 'San Francisco',
      manager: 'Sarah Johnson',
      skills: ['Python', 'Django', 'PostgreSQL', 'AWS'],
      rating: 4.7
    },
    {
      id: 4,
      name: 'Sarah Wilson',
      email: 'sarah.wilson@example.com',
      department: 'Design',
      position: 'UX Designer',
      salary: 72000,
      startDate: '2020-11-05',
      isActive: true,
      location: 'Seattle',
      manager: 'Alex Thompson',
      skills: ['Figma', 'Sketch', 'User Research', 'Prototyping'],
      rating: 4.9
    },
    {
      id: 5,
      name: 'David Rodriguez',
      email: 'david.rodriguez@example.com',
      department: 'Sales',
      position: 'Account Executive',
      salary: 68000,
      startDate: '2018-09-12',
      isActive: true,
      location: 'Chicago',
      manager: 'Lisa Martinez',
      skills: ['CRM', 'Negotiations', 'Lead Generation', 'Customer Relations'],
      rating: 4.4
    },
    {
      id: 6,
      name: 'Jessica Kim',
      email: 'jessica.kim@example.com',
      department: 'Engineering',
      position: 'DevOps Engineer',
      salary: 92000,
      startDate: '2021-06-18',
      isActive: true,
      location: 'Austin',
      manager: 'Sarah Johnson',
      skills: ['Docker', 'Kubernetes', 'AWS', 'CI/CD'],
      rating: 4.8
    },
    {
      id: 7,
      name: 'Robert Taylor',
      email: 'robert.taylor@example.com',
      department: 'Finance',
      position: 'Financial Analyst',
      salary: 65000,
      startDate: '2019-12-03',
      isActive: false,
      location: 'Boston',
      manager: 'Karen White',
      skills: ['Excel', 'SQL', 'Financial Modeling', 'PowerBI'],
      rating: 4.2
    },
    {
      id: 8,
      name: 'Amanda Garcia',
      email: 'amanda.garcia@example.com',
      department: 'HR',
      position: 'HR Specialist',
      salary: 58000,
      startDate: '2020-08-14',
      isActive: true,
      location: 'Denver',
      manager: 'James Wilson',
      skills: ['Recruitment', 'Employee Relations', 'HRIS', 'Training'],
      rating: 4.5
    },
    {
      id: 9,
      name: 'Christopher Lee',
      email: 'christopher.lee@example.com',
      department: 'Engineering',
      position: 'Backend Developer',
      salary: 82000,
      startDate: '2022-02-28',
      isActive: true,
      location: 'Portland',
      manager: 'Sarah Johnson',
      skills: ['Java', 'Spring Boot', 'MySQL', 'Redis'],
      rating: 4.6
    },
    {
      id: 10,
      name: 'Michelle Johnson',
      email: 'michelle.johnson@example.com',
      department: 'Marketing',
      position: 'Content Specialist',
      salary: 55000,
      startDate: '2021-10-11',
      isActive: true,
      location: 'Miami',
      manager: 'Michael Brown',
      skills: ['Content Writing', 'WordPress', 'SEO', 'Photography'],
      rating: 4.3
    }
  ];

  /**
   * Simulate API delay
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Apply filters to mock data
   */
  private applyFilters(data: IDemoModel[], filter?: IDemoFilter): IDemoModel[] {
    if (!filter) return data;

    return data.filter(item => {
      // Name filters
      if (filter.name?.eq && item.name !== filter.name.eq) return false;
      if (filter.name?.neq && item.name === filter.name.neq) return false;
      if (filter.name?.contains && !item.name.toLowerCase().includes(filter.name.contains.toLowerCase())) return false;

      // Email filters
      if (filter.email?.eq && item.email !== filter.email.eq) return false;
      if (filter.email?.contains && !item.email.toLowerCase().includes(filter.email.contains.toLowerCase())) return false;

      // Department filters
      if (filter.department?.eq && item.department !== filter.department.eq) return false;
      if (filter.department?.in && !filter.department.in.includes(item.department)) return false;

      // Position filters
      if (filter.position?.eq && item.position !== filter.position.eq) return false;
      if (filter.position?.contains && !item.position.toLowerCase().includes(filter.position.contains.toLowerCase())) return false;

      // Salary filters
      if (filter.salary?.eq && item.salary !== filter.salary.eq) return false;
      if (filter.salary?.gt && item.salary <= filter.salary.gt) return false;
      if (filter.salary?.gte && item.salary < filter.salary.gte) return false;
      if (filter.salary?.lt && item.salary >= filter.salary.lt) return false;
      if (filter.salary?.lte && item.salary > filter.salary.lte) return false;
      if (filter.salary?.range && (item.salary < filter.salary.range[0] || item.salary > filter.salary.range[1])) return false;

      // Date filters
      if (filter.startDate?.eq && item.startDate !== filter.startDate.eq) return false;
      if (filter.startDate?.gt && new Date(item.startDate) <= new Date(filter.startDate.gt)) return false;
      if (filter.startDate?.gte && new Date(item.startDate) < new Date(filter.startDate.gte)) return false;
      if (filter.startDate?.lt && new Date(item.startDate) >= new Date(filter.startDate.lt)) return false;
      if (filter.startDate?.lte && new Date(item.startDate) > new Date(filter.startDate.lte)) return false;

      // Boolean filters
      if (filter.isActive?.eq !== undefined && item.isActive !== filter.isActive.eq) return false;

      // Location filters
      if (filter.location?.eq && item.location !== filter.location.eq) return false;
      if (filter.location?.in && !filter.location.in.includes(item.location)) return false;

      // Manager filters
      if (filter.manager?.eq && item.manager !== filter.manager.eq) return false;
      if (filter.manager?.contains && !item.manager.toLowerCase().includes(filter.manager.contains.toLowerCase())) return false;

      // Rating filters
      if (filter.rating?.eq && item.rating !== filter.rating.eq) return false;
      if (filter.rating?.gt && item.rating <= filter.rating.gt) return false;
      if (filter.rating?.gte && item.rating < filter.rating.gte) return false;
      if (filter.rating?.lt && item.rating >= filter.rating.lt) return false;
      if (filter.rating?.lte && item.rating > filter.rating.lte) return false;
      if (filter.rating?.range && (item.rating < filter.rating.range[0] || item.rating > filter.rating.range[1])) return false;

      return true;
    });
  }

  /**
   * Apply search term to mock data
   */
  private applySearch(data: IDemoModel[], searchTerm?: string): IDemoModel[] {
    if (!searchTerm) return data;

    const term = searchTerm.toLowerCase();
    return data.filter(item => 
      item.name.toLowerCase().includes(term) ||
      item.email.toLowerCase().includes(term) ||
      item.department.toLowerCase().includes(term) ||
      item.position.toLowerCase().includes(term) ||
      item.location.toLowerCase().includes(term) ||
      item.manager.toLowerCase().includes(term) ||
      item.skills.some(skill => skill.toLowerCase().includes(term))
    );
  }

  /**
   * Apply sorting to mock data
   */
  private applySorting(data: IDemoModel[], orderBy?: IDemoOrderBy): IDemoModel[] {
    if (!orderBy) return data;

    const sortedData = [...data];
    
    // Apply each sort field
    Object.entries(orderBy).forEach(([field, direction]) => {
      sortedData.sort((a, b) => {
        const aValue = a[field as keyof IDemoModel];
        const bValue = b[field as keyof IDemoModel];
        
        let comparison = 0;
        if (aValue < bValue) comparison = -1;
        if (aValue > bValue) comparison = 1;
        
        return direction === 'desc' ? -comparison : comparison;
      });
    });

    return sortedData;
  }

  /**
   * Mock query implementation
   */
  async Query(request: { body: IDemoSearchQuery }): Promise<{ rows?: IDemoModel[]; totalRowCount?: number }> {
    // Simulate API delay
    await this.delay(Math.random() * 500 + 200);

    const { 
      currentPage = 0, 
      pageSize = 20, 
      excludePageCount = false,
      searchTerm, 
      filter, 
      orderBy 
    } = request.body;

    // Start with all mock data
    let filteredData = [...MockDemoClient.MOCK_DATA];

    // Apply search
    filteredData = this.applySearch(filteredData, searchTerm);

    // Apply filters
    filteredData = this.applyFilters(filteredData, filter);

    // Apply sorting
    filteredData = this.applySorting(filteredData, orderBy);

    // Get total count before pagination
    const totalRowCount = filteredData.length;

    // Apply pagination
    const startIndex = currentPage * pageSize;
    const endIndex = startIndex + pageSize;
    const paginatedData = filteredData.slice(startIndex, endIndex);

    return {
      rows: paginatedData,
      totalRowCount: excludePageCount ? totalRowCount : undefined
    };
  }
}