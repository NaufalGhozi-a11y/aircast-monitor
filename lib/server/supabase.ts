type QueryResult<T = any> = Promise<{ data: T; error: any }>;

const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;


const headers = { apikey: key, Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' };
const endpoint = (table: string) => `${base}/rest/v1/${table}`;

class TableQuery {
  private table: string; private method = 'GET'; private body: any; private filters: string[] = []; private orderBy = ''; private limitN = ''; private selectFields = '*'; private prefer = '';
  constructor(table: string) { this.table = table; }
  select(fields='*'): this { this.selectFields = fields; return this; }
  eq(field: string, value: any): this { this.filters.push(`${field}=eq.${encodeURIComponent(String(value))}`); return this; }
  order(field: string, opts?: { ascending?: boolean }): this { this.orderBy = `&order=${field}.${opts?.ascending === false ? 'desc' : 'asc'}`; return this; }
  limit(n: number): this { this.limitN = `&limit=${n}`; return this; }
  insert(row: any | any[]): this { this.method='POST'; this.body=row; this.prefer='return=representation'; return this; }
  update(row: any): this { this.method='PATCH'; this.body=row; this.prefer='return=representation'; return this; }
  delete(): this { this.method='DELETE'; return this; }
  async maybeSingle(): QueryResult<any> { const r=await this.exec(); return {data:Array.isArray(r.data)?(r.data[0]??null):r.data,error:r.error}; }
  async single(): QueryResult<any> { const r=await this.exec(); return {data:Array.isArray(r.data)?r.data[0]:r.data,error:r.error}; }
  then<TResult1 = any, TResult2 = never>(onfulfilled?: ((value: {data:any;error:any})=>TResult1|PromiseLike<TResult1>) | null, onrejected?: ((reason:any)=>TResult2|PromiseLike<TResult2>) | null) { return this.exec().then(onfulfilled as any,onrejected as any); }
  private async exec(): Promise<{data:any;error:any}> {
    if (!base || !key) return { data: null, error: { message: 'Supabase is not configured. Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local.' } };
    let url=`${endpoint(this.table)}?select=${encodeURIComponent(this.selectFields)}${this.filters.length?'&'+this.filters.join('&'):''}${this.orderBy}${this.limitN}`;
    try { const res=await fetch(url,{method:this.method,headers:{...headers,...(this.prefer?{'Prefer':this.prefer}:{})},body:this.body?JSON.stringify(this.body):undefined,cache:'no-store'}); const text=await res.text(); const data=text?JSON.parse(text):null; return res.ok?{data,error:null}:{data:null,error:{message:data?.message||text||res.statusText}}; } catch(e){return {data:null,error:e};}
  }
}

export const supabaseAdmin = { from: (table: string) => new TableQuery(table) };
