import Link from 'next/link';
import Icon from '@/components/Icon';
import { Badge, Card, EmptyState, PageHeader } from '@/components/ui';
import { requireUser } from '@/lib/auth';
import {
  SHOWCASE_QUERIES,
  browseTable,
  getServerInfo,
  listIndexes,
  listRoutines,
  listTables,
  listTriggers,
  runShowcaseQuery,
} from '@/lib/services/dbinfo';

export const dynamic = 'force-dynamic';

const VIEWS = [
  ['storage', 'Where it is stored', 'disk'],
  ['tables', 'Tables & rows', 'table'],
  ['structure', 'Triggers, procedures & indexes', 'bolt'],
  ['queries', 'Live queries', 'terminal'],
];

function formatNumber(n) {
  return Number(n || 0).toLocaleString('en-IN');
}

/* ------------------------------------------------------------------ storage */
function StorageView({ server, tables }) {
  const totalRows = tables.reduce((s, t) => s + t.rows, 0);
  const vectorRows = tables.filter((t) => t.kind === 'vector').reduce((s, t) => s + t.rows, 0);
  const dbFolder = server.dataDirectory ? `${server.dataDirectory}/base/${server.database_oid}/` : `base/${server.database_oid}/`;
  const port = server.connection?.port || '5432';

  const chain = server.inDocker
    ? [
        { icon: 'monitor', title: 'Your computer', body: `The app connects to localhost:${port}` },
        { icon: 'box', title: 'Docker Desktop', body: 'Runs PostgreSQL in a Linux container' },
        { icon: 'server', title: 'placement-portal-db', body: `PostgreSQL ${server.server_version} with pgvector ${server.pgvector_version || '—'}` },
        { icon: 'disk', title: 'placement-portal_pgdata', body: `Docker volume mounted at ${server.dataDirectory}` },
        { icon: 'database', title: server.database, body: `Folder base/${server.database_oid}/, one file per table` },
      ]
    : [
        { icon: 'monitor', title: 'Your computer', body: `The app connects to ${server.connection?.host || 'the server'}:${port}` },
        { icon: 'server', title: 'PostgreSQL server', body: `Version ${server.server_version} with pgvector ${server.pgvector_version || '—'}` },
        { icon: 'disk', title: 'Data directory', body: server.dataDirectory || 'Hidden (needs superuser to read)' },
        { icon: 'database', title: server.database, body: `Folder base/${server.database_oid}/, one file per table` },
      ];

  return (
    <div className="space-y-6">
      {/* The storage path, start to finish */}
      <section className="relative overflow-hidden rounded-[22px] bg-ink-900 p-6 sm:p-8">
        <div aria-hidden="true" className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full border-[40px] border-marigold-400/10" />
        <h2 className="relative text-2xl font-bold text-white">Your data is stored here</h2>
        <p className="relative mt-1 max-w-2xl text-sm text-ink-200">
          Follow the path from your computer to the folder PostgreSQL writes every row into.
        </p>

        <ol className="relative mt-8 grid gap-3 lg:grid-flow-col lg:auto-cols-fr">
          {chain.map((node, i) => {
            const last = i === chain.length - 1;
            return (
              <li key={node.title} className="relative flex gap-3 lg:block">
                {!last ? (
                  <span aria-hidden="true" className="absolute left-5 top-12 h-[calc(100%-2rem)] w-px bg-white/15 lg:left-12 lg:top-5 lg:h-px lg:w-[calc(100%-1.5rem)]" />
                ) : null}
                <span
                  className={`relative z-10 grid h-10 w-10 shrink-0 place-items-center rounded-xl ${
                    last ? 'bg-marigold-400 text-ink-950' : 'bg-white/10 text-ink-100'
                  }`}
                >
                  <Icon name={node.icon} size={20} />
                </span>
                <div className="lg:mt-3 lg:pr-3">
                  <div className={`break-all font-display text-[15px] font-bold ${last ? 'text-marigold-300' : 'text-white'}`}>{node.title}</div>
                  <div className="mt-0.5 text-xs leading-relaxed text-ink-200">{node.body}</div>
                </div>
              </li>
            );
          })}
        </ol>

        <div className="relative mt-8 rounded-xl bg-black/25 p-4 ring-1 ring-white/10">
          <div className="text-xs font-medium text-ink-200">Full path of your database folder{server.inDocker ? ' (inside the container)' : ''}</div>
          <code className="mt-1 block break-all font-mono text-[15px] text-marigold-200">{dbFolder}</code>
        </div>
      </section>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {[
          ['Database size', server.size_pretty, 'disk'],
          ['Tables', tables.length, 'table'],
          ['Rows stored', formatNumber(totalRows), 'layers'],
          ['AI vectors stored', formatNumber(vectorRows), 'sparkles'],
        ].map(([label, value, icon]) => (
          <div key={label} className="card p-5">
            <div className="flex items-center justify-between text-sm font-medium text-muted">
              {label}
              <Icon name={icon} size={18} className="text-ink-400" />
            </div>
            <div className="mt-2 font-display text-[28px] font-bold text-ink-900">{value}</div>
          </div>
        ))}
      </div>

      {server.inDocker ? (
        <section className="card flex flex-col gap-5 p-6 md:flex-row md:items-center md:justify-between">
          <div className="flex items-start gap-4">
            <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-marigold-100 text-marigold-700">
              <Icon name="eye" size={22} />
            </span>
            <div>
              <h2 className="text-lg font-semibold">Browse it visually in pgAdmin</h2>
              <p className="mt-1 max-w-xl text-sm text-muted">
                pgAdmin is PostgreSQL’s version of MySQL Workbench. It runs next to your database in Docker and is
                already connected. In the left panel open Servers, then PlacementPortal database (password{' '}
                <code className="rounded bg-canvas px-1 font-mono text-[12px] text-ink-900">placement_dev_password</code>), then
                Databases, placement_portal, Schemas, public, Tables. Right-click a table and choose View/Edit Data.
              </p>
            </div>
          </div>
          <a href="http://localhost:5050" target="_blank" rel="noreferrer" className="btn-accent shrink-0">
            Open pgAdmin
          </a>
        </section>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-2">
        <Card icon="key" title="How the app connects" description="Read from DATABASE_URL in your .env file (the password is never shown)">
          <dl className="grid grid-cols-2 gap-4 text-sm">
            {[
              ['Host', server.connection?.host],
              ['Port', port],
              ['Database', server.database],
              ['User', server.db_user],
              ['PostgreSQL', server.server_version],
              ['pgvector', server.pgvector_version || 'not installed'],
              ['Server running for', server.uptime],
              ['Time zone', server.timezone],
            ].map(([k, v]) => (
              <div key={k}>
                <dt className="field-label">{k}</dt>
                <dd className="mt-0.5 break-all font-medium text-ink-900">{v ?? '—'}</dd>
              </div>
            ))}
          </dl>
          {String(port) !== '5432' ? (
            <p className="mt-4 rounded-lg bg-marigold-50 px-3 py-2 text-xs text-marigold-800">
              This project uses port {port}. Another PostgreSQL on your computer uses 5432, so always connect tools such as
              pgAdmin or DBeaver to port {port} to see these tables.
            </p>
          ) : null}
        </Card>

        <Card icon="terminal" title="Look at the files yourself" description="Run these in a terminal (VS Code: Terminal, New Terminal)">
          <div className="space-y-3">
            {server.inDocker ? (
              <>
                <div>
                  <div className="mb-1 text-xs font-semibold text-muted">Show the Docker volume that holds the data</div>
                  <pre className="code">docker volume inspect placement-portal_pgdata</pre>
                </div>
                <div>
                  <div className="mb-1 text-xs font-semibold text-muted">List the table files inside the database folder</div>
                  <pre className="code">{`docker exec placement-portal-db ls -la ${dbFolder}`}</pre>
                </div>
              </>
            ) : null}
            <div>
              <div className="mb-1 text-xs font-semibold text-muted">Open an SQL prompt on this database</div>
              <pre className="code">
                {server.inDocker
                  ? `docker exec -it placement-portal-db psql -U ${server.db_user} -d ${server.database}`
                  : `psql -h ${server.connection?.host} -p ${port} -U ${server.db_user} -d ${server.database}`}
              </pre>
            </div>
          </div>
          {server.inDocker ? (
            <p className="mt-4 text-xs leading-relaxed text-muted">
              On Windows, Docker Desktop keeps volumes inside its own virtual disk, so these files do not appear in File
              Explorer. You can also browse the volume in Docker Desktop under Volumes.
            </p>
          ) : null}
        </Card>
      </div>

      <div className="grid items-start gap-6 lg:grid-cols-2">
        {[
          ['relational', 'Relational tables', 'Applications, interviews, offers and everything else with strict rules', 'table'],
          ['vector', 'Vector tables (pgvector)', 'Embeddings of resumes, projects and job descriptions', 'sparkles'],
        ].map(([kind, title, description, icon]) => (
          <Card key={kind} icon={icon} title={title} description={description} bodyClassName="px-3 pb-3 pt-4">
            <ul>
              {tables
                .filter((t) => t.kind === kind)
                .map((t) => (
                  <li key={t.name}>
                    <Link
                      href={`/admin/database?view=tables&table=${t.name}`}
                      className="flex items-center justify-between gap-3 rounded-lg px-3 py-2 text-sm hover:bg-ink-50"
                    >
                      <span className="font-mono text-[13px] font-medium text-ink-900">{t.name}</span>
                      <span className="text-xs text-muted">
                        {formatNumber(t.rows)} rows, {t.total_size}
                      </span>
                    </Link>
                  </li>
                ))}
            </ul>
          </Card>
        ))}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ tables */
async function TablesView({ tables, selected }) {
  const browse = selected ? await browseTable(selected) : null;
  return (
    <div className="space-y-6">
      <Card icon="table" title="All tables" description="Exact row counts, size on disk and the file that holds each table" bodyClassName="mt-4 overflow-x-auto" className="overflow-hidden">
        <table className="table">
          <thead>
            <tr>
              <th>Table</th>
              <th>Type</th>
              <th className="text-right">Rows</th>
              <th className="text-right">Size</th>
              <th>File on disk</th>
            </tr>
          </thead>
          <tbody>
            {tables.map((t) => (
              <tr key={t.name} className={selected === t.name ? 'bg-marigold-50/60' : ''}>
                <td>
                  <Link href={`/admin/database?view=tables&table=${t.name}`} className="font-mono text-[13px] font-semibold text-ink-700 hover:underline">
                    {t.name}
                  </Link>
                  <div className="text-xs text-muted">{t.purpose}</div>
                </td>
                <td>
                  <Badge tone={t.kind === 'vector' ? 'amber' : 'indigo'}>{t.kind === 'vector' ? 'Vector' : 'Relational'}</Badge>
                </td>
                <td className="text-right tabular-nums">{formatNumber(t.rows)}</td>
                <td className="whitespace-nowrap text-right tabular-nums">{t.total_size}</td>
                <td>
                  <code className="font-mono text-xs text-slate-600">{t.file_path}</code>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      {selected && !browse ? <EmptyState icon="alert" title="Unknown table" description="Pick a table from the list above." /> : null}
      {browse ? (
        <Card
          icon="eye"
          title={`Rows in ${browse.table.name}`}
          description={`First ${browse.rows.length} of ${formatNumber(browse.table.rows)} rows. Passwords are masked, files and vectors are summarised.`}
          bodyClassName="mt-4 overflow-x-auto"
          className="overflow-hidden"
        >
          {browse.rows.length === 0 ? (
            <p className="px-6 pb-6 text-sm text-muted">This table is empty.</p>
          ) : (
            <table className="table">
              <thead>
                <tr>
                  {browse.columns.map((c) => (
                    <th key={c.name}>
                      <div className="font-mono text-[12px] text-ink-900">{c.name}</div>
                      <div className="font-normal text-[11px] text-muted">{c.type}</div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {browse.rows.map((row, i) => (
                  <tr key={i}>
                    {browse.columns.map((c) => (
                      <td key={c.name} className="max-w-[280px] font-mono text-[12px]">
                        {row[c.name] === null ? <span className="text-slate-300">null</span> : <span className="line-clamp-2 break-words">{row[c.name]}</span>}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Card>
      ) : !selected ? (
        <p className="text-sm text-muted">Select a table name to see its rows.</p>
      ) : null}
    </div>
  );
}

/* ------------------------------------------------------------------ structure */
async function StructureView() {
  const [triggers, routines, indexes] = await Promise.all([listTriggers(), listRoutines(), listIndexes()]);
  const kindTone = { 'Stored procedure': 'amber', 'Stored function': 'indigo', 'Trigger function': 'violet' };
  return (
    <div className="space-y-6">
      <Card icon="bolt" title={`Triggers (${triggers.length})`} description="Rules PostgreSQL runs automatically when rows change" bodyClassName="mt-4 overflow-x-auto" className="overflow-hidden">
        <table className="table">
          <thead>
            <tr>
              <th>Trigger</th>
              <th>Fires</th>
              <th>On table</th>
              <th>Runs function</th>
            </tr>
          </thead>
          <tbody>
            {triggers.map((t) => (
              <tr key={`${t.table_name}.${t.name}`}>
                <td className="font-mono text-[12.5px] font-semibold text-ink-900">{t.name}</td>
                <td className="whitespace-nowrap text-xs">
                  <Badge tone={t.timing === 'BEFORE' ? 'blue' : 'violet'}>{t.timing}</Badge>
                  <span className="ml-2 text-slate-600">{t.events}</span>
                </td>
                <td className="font-mono text-[12.5px]">{t.table_name}</td>
                <td className="font-mono text-[12.5px] text-ink-700">{t.function_name}()</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      <Card icon="terminal" title={`Stored procedures & functions (${routines.length})`} description="Business logic that lives inside the database" bodyClassName="mt-4 overflow-x-auto" className="overflow-hidden">
        <table className="table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Kind</th>
              <th>Returns</th>
              <th>Language</th>
            </tr>
          </thead>
          <tbody>
            {routines.map((r) => (
              <tr key={`${r.name}(${r.arguments})`}>
                <td className="font-mono text-[12.5px]">
                  <span className="font-semibold text-ink-900">{r.name}</span>
                  <span className="text-slate-500">({r.arguments})</span>
                </td>
                <td>
                  <Badge tone={kindTone[r.kind] || 'slate'}>{r.kind}</Badge>
                </td>
                <td className="max-w-[320px] font-mono text-[12px] text-slate-600">{r.returns || '—'}</td>
                <td className="text-xs">{r.language}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      <Card icon="layers" title={`Indexes (${indexes.length})`} description="HNSW indexes make vector search fast; B-tree and GIN indexes speed up lookups" bodyClassName="mt-4 overflow-x-auto" className="overflow-hidden">
        <table className="table">
          <thead>
            <tr>
              <th>Index</th>
              <th>Table</th>
              <th>Method</th>
              <th className="text-right">Size</th>
            </tr>
          </thead>
          <tbody>
            {indexes.map((ix) => (
              <tr key={ix.name}>
                <td className="font-mono text-[12.5px] font-semibold text-ink-900">
                  {ix.name}
                  {ix.is_primary ? <span className="ml-2 text-[11px] font-normal text-muted">primary key</span> : ix.is_unique ? <span className="ml-2 text-[11px] font-normal text-muted">unique</span> : null}
                </td>
                <td className="font-mono text-[12.5px]">{ix.table_name}</td>
                <td>
                  <Badge tone={ix.method === 'hnsw' ? 'amber' : ix.method === 'gin' ? 'violet' : 'slate'}>{ix.method}</Badge>
                </td>
                <td className="text-right tabular-nums">{ix.size}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}

/* ------------------------------------------------------------------ queries */
async function QueriesView({ run }) {
  const result = run ? await runShowcaseQuery(run) : null;
  return (
    <div className="space-y-5">
      <p className="max-w-2xl text-sm text-muted">
        Ready-made, read-only queries that demonstrate each database feature. Press Run to execute one against your live
        database.
      </p>
      {SHOWCASE_QUERIES.map((q) => {
        const active = result?.item.id === q.id;
        return (
          <section key={q.id} id={q.id} className={`card overflow-hidden ${active ? 'border-ink-300' : ''}`}>
            <div className="flex flex-col gap-3 px-6 pt-5 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-lg font-semibold">{q.title}</h2>
                  <Badge tone="amber">{q.feature}</Badge>
                </div>
                <p className="mt-1 max-w-2xl text-sm text-muted">{q.description}</p>
              </div>
              <Link href={`/admin/database?view=queries&run=${q.id}#${q.id}`} className="btn-primary btn-sm shrink-0">
                <Icon name="play" size={13} />
                Run query
              </Link>
            </div>
            <div className="px-6 pb-5 pt-4">
              <pre className="code">{q.sql}</pre>
            </div>
            {active ? (
              <div className="border-t border-line bg-canvas/50">
                <div className="flex items-center justify-between px-6 py-3 text-xs text-muted">
                  <span className="font-semibold text-ink-900">
                    {result.error ? 'Query failed' : `${result.rows.length} row${result.rows.length === 1 ? '' : 's'}`}
                  </span>
                  <span>{result.ms} ms</span>
                </div>
                {result.error ? (
                  <p className="px-6 pb-5 text-sm text-red-700">{result.error}</p>
                ) : result.rows.length === 0 ? (
                  <p className="px-6 pb-5 text-sm text-muted">No rows returned.</p>
                ) : (
                  <div className="overflow-x-auto bg-white">
                    <table className="table">
                      <thead>
                        <tr>
                          {result.columns.map((c) => (
                            <th key={c} className="font-mono">
                              {c}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {result.rows.map((row, i) => (
                          <tr key={i}>
                            {result.columns.map((c) => (
                              <td key={c} className="font-mono text-[12.5px]">
                                {row[c] === null ? (
                                  <span className="text-slate-300">null</span>
                                ) : row[c] instanceof Date ? (
                                  row[c].toISOString().replace('T', ' ').slice(0, 19)
                                ) : (
                                  String(row[c])
                                )}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            ) : null}
          </section>
        );
      })}
    </div>
  );
}

/* ------------------------------------------------------------------ page */
export default async function DatabasePage({ searchParams }) {
  await requireUser('ADMIN');
  const sp = (await searchParams) || {};
  const view = VIEWS.some(([key]) => key === sp.view) ? sp.view : 'storage';
  const [server, tables] = await Promise.all([getServerInfo(), listTables()]);

  let content;
  if (view === 'tables') content = await TablesView({ tables, selected: typeof sp.table === 'string' ? sp.table : null });
  else if (view === 'structure') content = await StructureView();
  else if (view === 'queries') content = await QueriesView({ run: typeof sp.run === 'string' ? sp.run : null });
  else content = <StorageView server={server} tables={tables} />;

  return (
    <div className="space-y-6">
      <PageHeader
        icon="database"
        title="Database"
        subtitle={`PostgreSQL ${server.server_version} database "${server.database}", ${server.size_pretty} on disk across ${tables.length} tables.`}
      />
      <nav className="flex gap-1 overflow-x-auto rounded-xl border border-line bg-white p-1" aria-label="Database views">
        {VIEWS.map(([key, label, icon]) => (
          <Link
            key={key}
            href={`/admin/database?view=${key}`}
            aria-current={view === key ? 'page' : undefined}
            className={`inline-flex items-center gap-2 whitespace-nowrap rounded-[10px] px-4 py-2 text-sm font-semibold transition-colors ${
              view === key ? 'bg-ink-900 text-white' : 'text-slate-600 hover:bg-ink-50 hover:text-ink-900'
            }`}
          >
            <Icon name={icon} size={16} className={view === key ? 'text-marigold-300' : ''} />
            {label}
          </Link>
        ))}
      </nav>
      {content}
    </div>
  );
}
