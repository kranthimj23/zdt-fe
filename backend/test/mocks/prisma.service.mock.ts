import { Injectable } from '@nestjs/common';

@Injectable()
export class PrismaServiceMock {
    [key: string]: any;

    private stores: Record<string, Map<string, any>> = {
        project: new Map(),
        promotionRepo: new Map(),
        sourceRepo: new Map(),
        environment: new Map(),
        credential: new Map(),
        branchTracker: new Map(),
    };

    private nextId() {
        return Math.random().toString(36).substring(2, 11);
    }

    private getStore(model: string) {
        if (!this.stores[model]) {
            this.stores[model] = new Map();
        }
        return this.stores[model];
    }

    constructor() {
        this.project = this.createMockModel('project');
        this.credential = this.createMockModel('credential');
        this.environment = this.createMockModel('environment');
        this.promotionRepo = this.createMockModel('promotionRepo');
        this.sourceRepo = this.createMockModel('sourceRepo');
        this.branchTracker = this.createMockModel('branchTracker');
    }

    private createMockModel(model: string) {
        const mockModel: any = {
            create: jest.fn().mockImplementation((args: any) => {
                const data = args.data;
                const id = this.nextId();
                const record = { ...data, id, createdAt: new Date(), updatedAt: new Date() };
                if (model === 'project') record.status = 'active';
                this.getStore(model).set(id, record);
                return Promise.resolve(record);
            }),
            createMany: jest.fn().mockImplementation((args: any) => {
                const data = args.data as any[];
                const records = data.map(d => ({ ...d, id: this.nextId(), createdAt: new Date(), updatedAt: new Date() }));
                records.forEach(r => this.getStore(model).set(r.id, r));
                return Promise.resolve({ count: records.length });
            }),
            findUnique: jest.fn().mockImplementation((args: any) => {
                const where = args.where;
                const store = this.getStore(model);
                if (where.id) return Promise.resolve(store.get(where.id) || null);
                if (where.name) return Promise.resolve(Array.from(store.values()).find(x => x.name === where.name) || null);
                if (where.projectId) return Promise.resolve(Array.from(store.values()).find(x => x.projectId === where.projectId) || null);
                return Promise.resolve(null);
            }),
            findUniqueOrThrow: jest.fn().mockImplementation((args: any) =>
                mockModel.findUnique(args).then((res: any) => res || Promise.reject(new Error(`${model} not found`)))
            ),
            findFirst: jest.fn().mockImplementation((args: any) => {
                const where = args.where;
                const results = Array.from(this.getStore(model).values());
                const match = results.find(x => {
                    return Object.entries(where).every(([key, val]) => {
                        if (key === 'OR' && Array.isArray(val)) {
                            return val.some(condition => Object.entries(condition).every(([ck, cv]) => x[ck] === cv));
                        }
                        return x[key] === val;
                    });
                });
                return Promise.resolve(match || null);
            }),
            findMany: jest.fn().mockImplementation((args: any = {}) => {
                const { where, orderBy, select, skip = 0, take = 100 } = args;
                let results = Array.from(this.getStore(model).values());
                if (where) {
                    results = results.filter(x => {
                        return Object.entries(where).every(([key, val]) => x[key] === val);
                    });
                }
                if (orderBy) {
                    const [field, dir] = Object.entries(orderBy)[0] as [string, string];
                    results.sort((a, b) => dir === 'asc' ? (a[field] > b[field] ? 1 : -1) : (a[field] < b[field] ? 1 : -1));
                }
                if (select) {
                    results = results.map(x => {
                        const selected: any = {};
                        Object.keys(select).forEach(k => { if (select[k]) selected[k] = x[k]; });
                        return selected;
                    });
                }
                return Promise.resolve(results.slice(skip, skip + take));
            }),
            update: jest.fn().mockImplementation((args: any) => {
                const { where, data } = args;
                const store = this.getStore(model);
                const existing = store.get(where.id);
                if (!existing) return Promise.reject(new Error('Record not found'));
                const updated = { ...existing, ...data, updatedAt: new Date() };
                store.set(where.id, updated);
                return Promise.resolve(updated);
            }),
            count: jest.fn().mockImplementation((args: any = {}) => {
                const where = args.where;
                let results = Array.from(this.getStore(model).values());
                if (where) {
                    results = results.filter(x => {
                        return Object.entries(where).every(([key, val]) => x[key] === val);
                    });
                }
                return Promise.resolve(results.length);
            }),
            delete: jest.fn().mockImplementation((args: any) => {
                const where = args.where;
                this.getStore(model).delete(where.id);
                return Promise.resolve({ id: where.id });
            }),
        };
        return mockModel;
    }

    $queryRaw = jest.fn().mockResolvedValue([{ '?column?': 1 }]);

    reset() {
        Object.values(this.stores).forEach(store => store.clear());
        jest.clearAllMocks();
    }
}
