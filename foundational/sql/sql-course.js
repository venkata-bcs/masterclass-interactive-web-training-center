// SQL Foundations: slide engine and course content, on real PostgreSQL.
// Slides follow github.com/tinitiateprime/postgresql (postgresql-ddl.md, postgresql-dml.md).
// Each page sets data-py-page on <main>: "home" or a key of DECKS ("ddl", "dml").
// Shares the Python course stylesheet (../python/python-course.css); sql-course.css adds the result grid and database panel.
const SqlCourse = (() => {
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const toInt = (v, d = 0) => { const n = Math.trunc(Number(v)); return Number.isFinite(n) ? n : d; };
  const sqlStr = s => "'" + String(s).replace(/'/g, "''") + "'";

  // ---------- Slide visuals ----------
  const C = { cmd: '#38bdf8', obj: '#a78bfa', val: '#34d399', op: '#facc15', red: '#f87171' };
  const anatomy = parts => '<div class="py-anatomy">' + parts.map(([code, label, color], i) => `<div style="--part:${color};animation-delay:${i * 0.1}s"><code>${esc(code)}</code><span>${label}</span></div>`).join('') + '</div>';
  const recapTable = rows => '<table class="py-table"><thead><tr><th>You want to…</th><th>Write</th></tr></thead><tbody>' +
    rows.map(([want, write]) => `<tr><td style="font-family:inherit;color:#cbd5e1;font-weight:500;">${want}</td><td style="font-family:var(--font-mono);color:#fde68a;">${write}</td></tr>`).join('') + '</tbody></table>';
  const nest = levels => '<div class="sql-nest">' + levels.reduceRight((inner, [name, note]) => `<div class="sql-nest-box"><b>${esc(name)}</b><small>${note}</small>${inner}</div>`, '') + '</div>';

  // ---------- The sample database (postgresql-ddl.md, one schema, one set of column names) ----------
  const SCHEMA = 'CREATE SCHEMA emp;';
  const T = {
    dept: `CREATE TABLE emp.dept (
    deptno INT,
    dname  VARCHAR(14),
    loc    VARCHAR(13)
);`,
    emp: `CREATE TABLE emp.emp (
    empno      INT,
    ename      VARCHAR(10),
    job        VARCHAR(9),
    mgr        NUMERIC(4),
    sal        NUMERIC(7,2),
    commission NUMERIC(7,2),
    deptno     INT
);`,
    salgrade: `CREATE TABLE emp.salgrade (
    grade INT,
    losal INT,
    hisal INT
);`,
    projects: `CREATE TABLE emp.projects (
    projectno          INT,
    budget             NUMERIC(7,2),
    monthly_commission NUMERIC(7,2)
);`,
    emp_projects: `CREATE TABLE emp.emp_projects (
    emp_projectno INT,
    empno         INT,
    projectno     INT,
    start_date    DATE,
    end_date      DATE
);`
  };
  const SEED = {
    dept: `INSERT INTO emp.dept (deptno, dname) VALUES (1000, 'PRODUCTION'), (2000, 'FOUNDRY'), (3000, 'STORES'), (4000, 'SALES');`,
    emp: `INSERT INTO emp.emp (empno, ename, sal, deptno) VALUES (101, 'John Doe', 5000.00, 1000), (102, 'Jane Smith', 6000.00, 2000);`,
    projects: `INSERT INTO emp.projects VALUES (1, 45000.00, 1500.00);`,
    emp_projects: `INSERT INTO emp.emp_projects VALUES (1, 101, 1, '2024-01-15', '2024-12-31');`
  };
  const RULES = `ALTER TABLE emp.dept ADD PRIMARY KEY (deptno);
ALTER TABLE emp.emp ADD PRIMARY KEY (empno);
ALTER TABLE emp.emp ADD FOREIGN KEY (deptno) REFERENCES emp.dept (deptno);`;
  const setup = (...parts) => parts.join('\n');
  const BASE = setup(SCHEMA, T.dept, T.emp);
  const BASE_DATA = setup(BASE, SEED.dept, SEED.emp);
  const RULED = setup(BASE_DATA, RULES);

  // ---------- Course content ----------
  const DECKS = {
    ddl: {
      name: 'DDL: Build the Structure', short: 'DDL', page: 'ddl.html', accent: '#38bdf8',
      icon: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="16" rx="2"/><path d="M3 10h18M9 10v10"/></svg>',
      blurb: 'CREATE the schema and tables, ALTER them when needs change, and DROP what you no longer want.',
      glossary: [
        ['DDL', 'Data Definition Language: the SQL commands that build and change the structure of a database.'],
        ['database', 'A named container on the server that holds schemas.'],
        ['schema', 'A named folder inside a database that groups tables.'],
        ['table', 'A grid of data. Columns are fixed, rows are added over time.'],
        ['column', 'One named field of a table, with a data type, like sal or ename.'],
        ['row', 'One record in a table, like one employee.'],
        ['data type', 'The kind of value a column accepts: INT, VARCHAR, NUMERIC, DATE.'],
        ['search_path', 'The list of schemas PostgreSQL looks in when you leave the schema off a name.'],
        ['NULL', 'The value of a cell that has nothing in it. Not zero, and not empty text.']
      ],
      slides: [
        {
          title: 'What is DDL?', file: 'Introduction',
          idea: 'DDL commands build the <strong>structure</strong> of a database: the tables, not the data inside them.',
          analogy: 'Picture a new office. DDL builds the <strong>filing cabinets and labels the drawers</strong>. Putting papers in the drawers comes later, and that is DML.',
          explain: `<p>There are three main DDL commands:</p><ul><li><code>CREATE</code> makes something new</li><li><code>ALTER</code> changes something that exists</li><li><code>DROP</code> removes it</li></ul>`,
          visual: anatomy([['CREATE', 'make it', C.val], ['ALTER', 'change it', C.op], ['DROP', 'remove it', C.red]]),
          code: `-- Create a schema, then one empty table inside it\n${SCHEMA}\n\n${T.dept}\n\n-- Look at the new table. It has columns but no rows yet\nSELECT * FROM emp.dept;`,
          tip: 'This is real PostgreSQL running inside your browser. Press <strong>Run</strong>, then look at the <strong>Your database</strong> panel: everything you build shows up there.'
        },
        {
          title: 'Which database am I in?', file: 'CREATE',
          idea: 'One PostgreSQL server holds many databases. You choose one when you <strong>connect</strong>.',
          analogy: 'The server is an office building and each database is a company on its own floor. You pick your floor in the lift, before you start work.',
          explain: `<p>Some databases have a <code>USE</code> command for switching. PostgreSQL does not, so the <code>USE DATABASE</code> line in this code fails. Read the error: you will see many of these, and they always tell you the line.</p><p>To reach a database called <code>tinitiate</code>, connect to it with <code>psql -d tinitiate</code>, or type <code>\\c tinitiate</code> inside the psql tool.</p>`,
          code: `-- Ask the server who and where you are\nSELECT current_database(), current_user;\n\n-- This is not PostgreSQL, so the server refuses it\nUSE DATABASE tinitiate;`,
          tip: 'This course is connected to the built-in database called <code>postgres</code>. Delete the <code>USE</code> line and press Run: the error is gone.'
        },
        {
          title: 'Create a schema', file: 'CREATE',
          idea: 'A <strong>schema</strong> is a named folder inside a database. Tables live in schemas.',
          analogy: 'A database is a cabinet, a schema is a drawer, and a table is a folder in that drawer.',
          explain: `<p>Every database starts with one schema called <code>public</code>. A schema of your own keeps related tables together. This course uses a schema called <code>emp</code> for employee data.</p>`,
          controls: [{ key: 'name', label: 'schema name', type: 'text', value: 'emp' }],
          visual: nest([['database: postgres', 'the cabinet'], ['schema: emp', 'a drawer'], ['table: dept', 'a folder']]),
          render: v => ({ code: `-- A new, empty folder for tables\nCREATE SCHEMA ${v.name};` }),
          tip: 'Change the schema name and watch the panel. Try a name with a space in it, like <code>my data</code>, and read the error.'
        },
        {
          title: 'Create a user and give them the schema', file: 'CREATE',
          idea: 'A <strong>user</strong> is an account that logs in. Every schema has one <strong>owner</strong>.',
          analogy: 'Handing someone the keys to a drawer: it is now theirs, and they decide what happens to it.',
          explain: `<ul><li><code>CREATE USER</code> makes the login</li><li><code>ALTER SCHEMA ... OWNER TO</code> hands the schema to that user</li></ul><p>The last line reads PostgreSQL's own records to prove that the owner changed.</p>`,
          setup: SCHEMA,
          controls: [{ key: 'user', label: 'user name', type: 'text', value: 'ti' }],
          render: v => ({ code: `CREATE USER ${v.user} WITH PASSWORD 'Tinitiate!23';\n\nALTER SCHEMA emp OWNER TO ${v.user};\n\n-- Who owns the schema now?\nSELECT schema_name, schema_owner\nFROM information_schema.schemata\nWHERE schema_name = 'emp';` }),
          tip: 'The password here is only an example. On a real server, never write a real password into a code file.'
        },
        {
          title: 'search_path: stop typing the schema', file: 'CREATE',
          idea: '<code>SET search_path</code> tells PostgreSQL which schema you mean when you do not say.',
          analogy: 'Like opening a folder on your computer: once you are inside it, you can use short file names.',
          explain: `<p>The full name of a table is <code>schema.table</code>, like <code>emp.dept</code>. After <code>SET search_path TO emp</code>, a plain <code>dept</code> means <code>emp.dept</code>.</p>`,
          setup: SCHEMA,
          controls: [{ key: 'path', label: 'search_path', type: 'select', value: 0, options: ['emp', 'public'] }],
          render: v => ({ code: `-- Choose the schema for short names\nSET search_path TO ${v.path};\n\n-- No schema in front of the name\nCREATE TABLE dept (\n    deptno INT,\n    dname  VARCHAR(14),\n    loc    VARCHAR(13)\n);\n\nSHOW search_path;` }),
          tip: 'Switch the yellow box to <code>public</code>. The same code now puts the table in a different schema.'
        },
        {
          title: 'The parts of CREATE TABLE', file: 'CREATE',
          idea: '<code>CREATE TABLE</code> gives a table a name, and lists its columns with a data type for each.',
          analogy: 'You are designing a blank form: you decide what the boxes are called and what can be written in each one.',
          explain: `<ul><li>columns are separated by commas</li><li>there is no comma after the last column</li><li>the semicolon <code>;</code> ends the command</li></ul>`,
          setup: SCHEMA,
          controls: [
            { key: 'table', label: 'table name', type: 'text', value: 'dept' },
            { key: 'col', label: 'first column name', type: 'text', value: 'deptno' }
          ],
          visual: anatomy([['CREATE TABLE', 'the command', C.cmd], ['emp.dept', 'schema.table', C.obj], ['deptno', 'column name', C.val], ['INT', 'data type', C.op]]),
          render: v => ({ code: `CREATE TABLE emp.${v.table} (\n    ${v.col} INT,\n    dname  VARCHAR(14),\n    loc    VARCHAR(13)\n);` }),
          tip: 'Delete the comma after <code>INT</code> in the code and press Run. The error points at the line after the mistake, because that is where PostgreSQL got confused.'
        },
        {
          title: 'Data types: what a column accepts', file: 'CREATE',
          idea: 'Every column has a <strong>data type</strong>, and PostgreSQL refuses values that do not fit it.',
          analogy: 'The boxes on a form: one takes a phone number, another a date. The type stops the wrong thing going in the wrong box.',
          explain: `<ul><li><code>INT</code>: a whole number</li><li><code>VARCHAR(10)</code>: text, up to 10 characters</li><li><code>NUMERIC(7,2)</code>: an exact number, for money</li><li><code>DATE</code>: a calendar date</li></ul><p>Run this and open <code>emp.emp</code> in the panel to see each column's type. PostgreSQL's full name for <code>VARCHAR</code> is <code>character varying</code>.</p>`,
          setup: SCHEMA,
          code: `-- Create emp table\n${T.emp}`
        },
        {
          title: 'Reading NUMERIC(7,2)', file: 'CREATE',
          idea: '<code>NUMERIC(7,2)</code> means <strong>7 digits in total, 2 of them after the point</strong>.',
          analogy: 'A price sticker with room for 7 digits, where the last 2 are always the cents.',
          explain: `<p>That leaves 5 digits before the point, so the biggest value is <code>99999.99</code>.</p><ul><li>Too many digits after the point are <strong>rounded</strong></li><li>Too many digits before the point are an <strong>error</strong></li></ul>`,
          controls: [{ key: 'num', label: 'a number', type: 'text', value: '12345.678' }],
          render: v => ({ code: `-- Fit a number into NUMERIC(7,2)\nSELECT ${v.num}::NUMERIC(7,2) AS salary;` }),
          tip: 'Try <code>99999.99</code>, then <code>100000</code>. The <code>::</code> means "convert this to that type".'
        },
        {
          title: 'Build the remaining tables', file: 'CREATE',
          idea: 'One script can create many tables, one command after another.',
          explain: `<p><code>dept</code> and <code>emp</code> already exist. These three complete the employee database:</p><ul><li><code>salgrade</code>: the salary range of each grade</li><li><code>projects</code>: projects and their budgets</li><li><code>emp_projects</code>: which employee works on which project, and when</li></ul>`,
          setup: BASE,
          code: `-- Create Salgrade table\n${T.salgrade}\n\n-- Create projects table\n${T.projects}\n\n-- Create empprojects table\n${T.emp_projects}`,
          tip: 'Press Run a second time. Each Run starts from a clean database, so you can run a slide as often as you like. Then write <code>CREATE TABLE emp.dept (x INT);</code> at the end to see what happens when a name is already taken.'
        },
        {
          title: "Look at a table's structure", file: 'CREATE',
          idea: 'PostgreSQL keeps a record of every table. You can read it with an ordinary query.',
          analogy: 'The label on the front of the drawer: it tells you what is inside without opening every folder.',
          explain: `<p><code>information_schema.columns</code> lists every column of every table. The <code>WHERE</code> line narrows it to one table.</p>`,
          setup: setup(BASE, T.salgrade, T.projects, T.emp_projects),
          controls: [{ key: 't', label: 'table', type: 'select', value: 1, options: ['dept', 'emp', 'salgrade', 'projects', 'emp_projects'] }],
          render: v => ({ code: `SELECT column_name, data_type\nFROM information_schema.columns\nWHERE table_schema = 'emp'\n  AND table_name = '${v.t}'\nORDER BY ordinal_position;` }),
          tip: 'In the psql tool, the shortcut is <code>\\d emp.emp</code>. It only works in psql, not in the SQL itself.'
        },
        {
          title: 'ALTER: rename a column', file: 'ALTER',
          idea: '<code>ALTER TABLE</code> changes a table that already exists. <code>RENAME COLUMN</code> gives a column a new name.',
          analogy: 'Replacing the label on a drawer. The papers inside do not move.',
          explain: `<p>The table already has rows here. Watch the panel after you run: the name changes and the data stays exactly as it was.</p>`,
          setup: setup(BASE, SEED.dept),
          controls: [{ key: 'name', label: 'new column name', type: 'text', value: 'department_name' }],
          visual: anatomy([['ALTER TABLE emp.dept', 'which table', C.cmd], ['RENAME COLUMN dname', 'old name', C.obj], ['TO department_name', 'new name', C.val]]),
          render: v => ({ code: `-- Alter table "dept": rename the column "dname"\nALTER TABLE emp.dept RENAME COLUMN dname TO ${v.name};\n\n-- To change back to previous, remove the -- from the next line\n-- ALTER TABLE emp.dept RENAME COLUMN ${v.name} TO dname;` })
        },
        {
          title: 'ALTER: add a column', file: 'ALTER',
          idea: '<code>ADD COLUMN</code> puts a new column on the end of a table.',
          analogy: 'Adding a new box to a form that people have already filled in: the old forms have that box empty.',
          explain: `<p>Existing rows get <code>NULL</code> in the new column. <code>NULL</code> means "nothing here yet". It is not zero, and it is not empty text.</p>`,
          setup: BASE_DATA,
          controls: [
            { key: 'col', label: 'column name', type: 'text', value: 'hire_date' },
            { key: 'type', label: 'data type', type: 'select', value: 0, options: ['DATE', 'INT', 'VARCHAR(20)'] }
          ],
          render: v => ({ code: `-- Alter table "emp": add a new column\nALTER TABLE emp.emp ADD COLUMN ${v.col} ${v.type};\n\n-- To change back to previous, remove the -- from the next line\n-- ALTER TABLE emp.emp DROP COLUMN ${v.col};` })
        },
        {
          title: 'ALTER: change a data type', file: 'ALTER',
          idea: '<code>ALTER COLUMN ... TYPE</code> changes what a column accepts.',
          analogy: 'Your wallet is too small for the new notes, so you move everything to a bigger one.',
          explain: `<p><code>budget</code> is <code>NUMERIC(7,2)</code>, so it cannot hold a million. The first <code>INSERT</code> fails, the column gets bigger, and the same <code>INSERT</code> then works.</p><p>You will learn <code>INSERT</code> properly in the next module. For now, it just adds a row.</p><p><code>DECIMAL</code> and <code>NUMERIC</code> are the same type in PostgreSQL, so the panel shows <code>numeric(12,2)</code>.</p>`,
          setup: setup(SCHEMA, T.projects, SEED.projects),
          code: `-- Too big for NUMERIC(7,2)\nINSERT INTO emp.projects VALUES (2, 1000000.00, 500.00);\n\n-- Alter table "projects": make the column bigger\nALTER TABLE emp.projects ALTER COLUMN budget TYPE DECIMAL(12,2);\n\n-- The same row now fits\nINSERT INTO emp.projects VALUES (2, 1000000.00, 500.00);`,
          tip: 'Add <code>ALTER TABLE emp.projects ALTER COLUMN budget TYPE NUMERIC(7,2);</code> at the end. Changing back fails while a value is too big for the smaller type.'
        },
        {
          title: 'ALTER: drop a column', file: 'ALTER',
          idea: '<code>DROP COLUMN</code> removes a column <strong>and every value in it</strong>.',
          analogy: 'Tearing one column out of a paper ledger. You can draw the lines again, but the writing is gone.',
          explain: `<p>Run it and look at the last result. Adding <code>end_date</code> back gives you the column, but every value is <code>NULL</code>. The old dates cannot be recovered.</p>`,
          setup: setup(SCHEMA, T.emp_projects, SEED.emp_projects),
          code: `-- Alter table "emp_projects": drop the column "end_date"\nALTER TABLE emp.emp_projects DROP COLUMN end_date;\n\n-- To change back to previous\nALTER TABLE emp.emp_projects ADD COLUMN end_date DATE;\n\n-- The column is back, the dates are not\nSELECT * FROM emp.emp_projects;`
        },
        {
          title: 'DROP: remove a table', file: 'DROP',
          idea: '<code>DROP TABLE</code> deletes a table and all its rows. PostgreSQL does not ask "are you sure?".',
          analogy: 'Putting the whole folder through the shredder, not just emptying it.',
          explain: `<p>After the drop, the table no longer exists, so the <code>SELECT</code> fails with <strong>relation does not exist</strong>. "Relation" is PostgreSQL's word for a table.</p>`,
          setup: setup(BASE, SEED.dept),
          code: `-- To drop dept table in emp schema\nDROP TABLE emp.dept;\n\n-- It is gone\nSELECT * FROM emp.dept;`
        },
        {
          title: 'Re-create a dropped table', file: 'DROP',
          idea: 'You can create a dropped table again from its script, but it comes back <strong>empty</strong>.',
          analogy: 'A new folder with the same label. The label is the same, but the papers are gone.',
          explain: `<p>This is why teams keep their <code>CREATE TABLE</code> scripts saved. The structure is easy to rebuild from a script. The data needs a backup.</p>`,
          setup: setup(BASE, SEED.dept),
          code: `DROP TABLE emp.dept;\n\n-- To again create it\n${T.dept}\n\n-- Same table, no rows\nSELECT * FROM emp.dept;`
        },
        {
          title: 'DDL on one page', file: 'Recap',
          idea: 'You can now build, change and remove the structure of a database.',
          explain: `<p>This script builds a small table and changes it. Rewrite it into anything you like.</p>`,
          visual: recapTable([
            ['make a schema', 'CREATE SCHEMA emp;'],
            ['use short names', 'SET search_path TO emp;'],
            ['make a table', 'CREATE TABLE emp.dept (...);'],
            ['rename a column', 'ALTER TABLE ... RENAME COLUMN a TO b;'],
            ['add a column', 'ALTER TABLE ... ADD COLUMN c DATE;'],
            ['change a type', 'ALTER TABLE ... ALTER COLUMN c TYPE ...;'],
            ['remove a column', 'ALTER TABLE ... DROP COLUMN c;'],
            ['remove a table', 'DROP TABLE emp.dept;']
          ]),
          code: `CREATE SCHEMA school;\n\nCREATE TABLE school.students (\n    id   INT,\n    name VARCHAR(30)\n);\n\nALTER TABLE school.students ADD COLUMN joined DATE;\nALTER TABLE school.students RENAME COLUMN name TO full_name;`
        }
      ]
    },

    dml: {
      name: 'DML: Work with the Data', short: 'DML', page: 'dml.html', accent: '#34d399',
      icon: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>',
      blurb: 'INSERT new rows, UPDATE the ones you have, DELETE what you no longer need, and see how PostgreSQL rejects bad data.',
      glossary: [
        ['DML', 'Data Manipulation Language: the SQL commands that add, change and remove rows.'],
        ['INSERT', 'Adds new rows to a table.'],
        ['UPDATE', 'Changes values in rows that already exist.'],
        ['DELETE', 'Removes rows from a table. The table itself stays.'],
        ['WHERE', 'Says which rows a command applies to. Leave it out and it applies to all of them.'],
        ['primary key', 'A column whose value must be unique and never NULL, so each row can be found exactly.'],
        ['foreign key', 'A column whose value must exist in another table, like an employee\'s department.'],
        ['constraint', 'A rule on a table that PostgreSQL enforces on every change.'],
        ['NULL', 'The value of a cell that has nothing in it. Not zero, and not empty text.']
      ],
      slides: [
        {
          title: 'What is DML?', file: 'Introduction',
          idea: 'DML commands work with the <strong>rows</strong> inside tables: add them, change them, remove them.',
          analogy: 'DDL built the filing cabinet. DML is the daily work: filing new papers, correcting them, and throwing out old ones.',
          explain: `<p>There are three commands, and this code uses all of them on the <code>dept</code> table. Watch the panel: rows that were added, changed or removed are coloured.</p>`,
          setup: BASE,
          visual: anatomy([['INSERT', 'add rows', C.val], ['UPDATE', 'change rows', C.op], ['DELETE', 'remove rows', C.red]]),
          code: `INSERT INTO emp.dept (deptno, dname) VALUES (1000, 'PRODUCTION');\nINSERT INTO emp.dept (deptno, dname) VALUES (2000, 'FOUNDRY');\n\nUPDATE emp.dept SET loc = 'CHICAGO' WHERE deptno = 1000;\n\nDELETE FROM emp.dept WHERE deptno = 2000;`,
          tip: 'Comment out the <code>DELETE</code> line by putting <code>--</code> in front of it, then press Run. The department stays.'
        },
        {
          title: 'INSERT: add one row', file: 'INSERT',
          idea: '<code>INSERT</code> adds a new row. You name the columns, then give a value for each.',
          analogy: 'Filling in one new form and dropping it into the folder.',
          explain: `<ul><li>the first brackets list the columns</li><li><code>VALUES</code> gives the data, in the same order</li><li>text goes in <strong>single</strong> quotes, numbers do not</li></ul><p><code>INSERT 0 1</code> in the result means one row was added. The <code>0</code> is a leftover from old PostgreSQL versions and you can ignore it.</p>`,
          setup: BASE,
          controls: [
            { key: 'no', label: 'deptno', type: 'number', value: 1000 },
            { key: 'name', label: 'dname', type: 'text', value: 'PRODUCTION' }
          ],
          visual: anatomy([['INSERT INTO emp.dept', 'which table', C.cmd], ['(deptno, dname)', 'which columns', C.obj], ['VALUES', 'the data comes next', C.op], ['(1000, \'PRODUCTION\')', 'one row', C.val]]),
          render: v => ({ code: `-- Insert with column created order\nINSERT INTO emp.dept (deptno, dname) VALUES (${v.no}, ${sqlStr(v.name)});` })
        },
        {
          title: 'Columns you leave out become NULL', file: 'INSERT',
          idea: 'You do not have to fill in every column. Any you skip become <code>NULL</code>.',
          analogy: 'Leaving some boxes on the form blank. The form still goes in the folder.',
          explain: `<p><code>emp</code> has seven columns, but these rows give only four. Look at the panel: <code>job</code>, <code>mgr</code> and <code>commission</code> are all <code>NULL</code>.</p>`,
          setup: setup(BASE, SEED.dept),
          controls: [
            { key: 'name', label: 'ename', type: 'text', value: 'John Doe' },
            { key: 'sal', label: 'sal', type: 'number', value: 5000 }
          ],
          render: v => ({ code: `INSERT INTO emp.emp (empno, ename, sal, deptno) VALUES\n(101, ${sqlStr(v.name)}, ${v.sal}.00, 1000);\n\nINSERT INTO emp.emp (empno, ename, sal, deptno) VALUES\n(102, 'Jane Smith', 6000.00, 2000);` }),
          tip: 'Make the name longer than 10 characters. <code>ename</code> is <code>VARCHAR(10)</code>, so PostgreSQL refuses it.'
        },
        {
          title: 'INSERT without column names', file: 'INSERT',
          idea: 'If you leave out the column list, values fill the columns <strong>in the order they were created</strong>.',
          analogy: 'Handing someone answers with no labels. It works only if they are in exactly the right order.',
          explain: `<p>The first <code>INSERT</code> works, and <code>loc</code> gets <code>NULL</code>. The second has its values in the wrong order, so PostgreSQL tries to put <code>'FOUNDRY'</code> into the number column <code>deptno</code>.</p><p>Naming the columns is safer: the code keeps working even if the table changes later.</p>`,
          setup: BASE,
          code: `-- Insert with positional values\nINSERT INTO emp.dept VALUES (2000, 'FOUNDRY');\n\n-- Wrong order: text is going into a number column\nINSERT INTO emp.dept VALUES ('FOUNDRY', 2000);`
        },
        {
          title: 'INSERT with columns in a different order', file: 'INSERT',
          idea: 'When you name the columns, you can list them in any order you like.',
          explain: `<p>The values only need to match <em>your</em> list. Here <code>dname</code> comes first, in both brackets, and the row still lands in the right columns.</p>`,
          setup: BASE,
          code: `-- Insert with column names, different order\nINSERT INTO emp.dept (dname, deptno) VALUES ('STORES', 3000);`
        },
        {
          title: 'INSERT without the schema', file: 'INSERT',
          idea: 'With <code>search_path</code> set, you can write <code>dept</code> instead of <code>emp.dept</code>.',
          explain: `<p>This is the <code>search_path</code> setting from the DDL module. Without it, PostgreSQL looks in the wrong schema and cannot find the table.</p>`,
          setup: BASE,
          controls: [{ key: 'path', label: 'search_path', type: 'select', value: 0, options: ['emp', 'public'] }],
          render: v => ({ code: `SET search_path TO ${v.path};\n\n-- No schema on the table name\nINSERT INTO dept (deptno, dname) VALUES (4000, 'SALES');` }),
          tip: 'Switch the yellow box to <code>public</code> and read the error.'
        },
        {
          title: 'INSERT many rows at once', file: 'INSERT',
          idea: 'One <code>INSERT</code> can add many rows. Separate the rows with commas.',
          analogy: 'Handing in a stack of forms at once, instead of walking to the folder for each one.',
          explain: `<p><code>INSERT 0 3</code> in the result means three rows were added. If one row is bad, none of them are added: it is all or nothing.</p>`,
          setup: BASE,
          code: `-- Insert more data in a single insert\nINSERT INTO emp.dept (deptno, dname)\nVALUES\n    (111, 'TECHNOLOGY'),\n    (211, 'FACTORY'),\n    (311, 'RETAIL');`,
          tip: 'Change one row to a name longer than 14 characters. All three rows are refused, not just that one.'
        },
        {
          title: 'INSERT from another table', file: 'INSERT',
          idea: '<code>INSERT ... SELECT</code> copies rows from one table into another.',
          analogy: 'Photocopying a stack of forms into a second folder, instead of writing each one out by hand.',
          explain: `<p>Replace <code>VALUES</code> with a <code>SELECT</code>, and every row it finds is inserted. The result shows <code>INSERT 0 4</code>: four rows copied.</p>`,
          setup: setup(BASE, SEED.dept),
          code: `-- Create table dept1\nCREATE TABLE emp.dept1 (\n    deptno INT,\n    dname  VARCHAR(100)\n);\n\n-- Insert data from dept into dept1\nINSERT INTO emp.dept1 (deptno, dname)\nSELECT deptno, dname\nFROM emp.dept;`,
          tip: 'Add <code>WHERE deptno &gt;= 3000</code> after <code>FROM emp.dept</code> to copy only some of the rows.'
        },
        {
          title: 'Rules: primary and foreign keys', file: 'INSERT',
          idea: 'A table accepts any row until you give it <strong>rules</strong>. Rules are what make bad data impossible.',
          analogy: 'A form clerk who checks each form: this ID is already used, and that department does not exist. Rejected.',
          explain: `<ul><li>A <strong>primary key</strong> says: this value must be unique, and never empty</li><li>A <strong>foreign key</strong> says: this value must exist in another table</li></ul><p>The next three slides break these rules on purpose. After you run this, look for the <span class="sql-key">PK</span> and <span class="sql-key fk">FK</span> marks in the panel.</p>`,
          setup: BASE_DATA,
          code: `-- deptno must be unique in dept\nALTER TABLE emp.dept ADD PRIMARY KEY (deptno);\n\n-- empno must be unique in emp\nALTER TABLE emp.emp ADD PRIMARY KEY (empno);\n\n-- an employee's deptno must exist in dept\nALTER TABLE emp.emp ADD FOREIGN KEY (deptno)\n    REFERENCES emp.dept (deptno);`
        },
        {
          title: 'Bad data: primary key violation', file: 'INSERT',
          idea: 'A primary key value can only be used once. A second row with the same value is refused.',
          analogy: 'Two employees cannot have the same ID badge number.',
          explain: `<p>Department <code>4000</code> already exists, so this row is rejected and the table does not change.</p>`,
          setup: RULED,
          controls: [{ key: 'no', label: 'deptno', type: 'number', value: 4000 }],
          render: v => ({ code: `-- Primary Key violation\nINSERT INTO emp.dept (deptno, dname) VALUES (${v.no}, 'MARKETING');` }),
          tip: 'Change <code>deptno</code> to a number that is not used yet, like <code>5000</code>.'
        },
        {
          title: 'Bad data: value too long', file: 'INSERT',
          idea: 'A value bigger than its column is refused. PostgreSQL does not cut it short for you.',
          analogy: 'A name that does not fit in the box on the form: the clerk hands it back to you.',
          explain: `<p><code>dname</code> is <code>VARCHAR(14)</code>, so 14 characters is the limit. Move the slider past 14 to see it fail.</p>`,
          setup: RULED,
          controls: [{ key: 'n', label: 'number of characters', type: 'range', value: 20, min: 1, max: 30 }],
          render: v => ({ code: `-- DataType Size violation\nINSERT INTO emp.dept (deptno, dname)\nVALUES (6, '${'A'.repeat(v.n)}');` })
        },
        {
          title: 'Bad data: foreign key violation', file: 'INSERT',
          idea: 'A foreign key value must exist in the other table.',
          analogy: 'You cannot assign someone to a department that does not exist.',
          explain: `<p>There is no department <code>6</code>, so this employee is refused. This rule keeps the two tables consistent with each other.</p>`,
          setup: RULED,
          controls: [{ key: 'dept', label: 'deptno', type: 'number', value: 6 }],
          render: v => ({ code: `-- Foreign Key violation\nINSERT INTO emp.emp (empno, ename, sal, deptno)\nVALUES (16, '4A', 11000.00, ${v.dept});` }),
          tip: 'Change <code>deptno</code> to <code>1000</code>, a department that exists.'
        },
        {
          title: 'UPDATE: change a row', file: 'UPDATE',
          idea: '<code>UPDATE</code> changes values in rows that already exist. <code>WHERE</code> says which rows.',
          analogy: 'Correcting one form in the folder with a pen. No new form, and no form thrown away.',
          explain: `<p>Read it like a sentence: in <code>emp.emp</code>, set <code>sal</code> to this amount, for the row where <code>empno</code> is 101.</p><p>The result <code>UPDATE 1</code> means one row was changed. <code>UPDATE 0</code> means nothing matched, and that is not an error.</p>`,
          setup: RULED,
          controls: [
            { key: 'sal', label: 'new sal', type: 'number', value: 6200 },
            { key: 'no', label: 'empno', type: 'number', value: 101 }
          ],
          visual: anatomy([['UPDATE emp.emp', 'which table', C.cmd], ['SET sal = 6200.00', 'the change', C.val], ['WHERE empno = 101', 'which rows', C.op]]),
          render: v => ({ code: `-- Update salary of an employee\nUPDATE emp.emp SET sal = ${v.sal}.00 WHERE empno = ${v.no};` }),
          tip: 'Change <code>empno</code> to <code>999</code>. No employee has that number, so the result is <code>UPDATE 0</code>.'
        },
        {
          title: 'UPDATE with two conditions', file: 'UPDATE',
          idea: 'Join conditions with <code>AND</code> when one is not enough to find the row.',
          analogy: 'Looking for "the John on the Sales team", not just "John".',
          explain: `<p>Employee 101 is on two projects, so <code>empno = 101</code> alone would change both rows. Adding <code>projectno = 1</code> picks exactly one.</p><p>Dates go in single quotes, written <code>YYYY-MM-DD</code>.</p>`,
          setup: setup(SCHEMA, T.emp_projects, `INSERT INTO emp.emp_projects VALUES (1, 101, 1, '2024-01-15', NULL), (2, 101, 2, '2024-02-01', NULL), (3, 102, 1, '2024-03-01', NULL);`),
          controls: [{ key: 'p', label: 'projectno', type: 'select', value: 0, options: ['1', '2'] }],
          render: v => ({ code: `-- Update project end date\nUPDATE emp.emp_projects SET end_date = '2024-06-01'\n WHERE projectno = ${v.p} AND empno = 101;` }),
          tip: 'Remove <code>AND empno = 101</code> from the code and press Run. Look at how many rows change.'
        },
        {
          title: 'The danger: UPDATE without WHERE', file: 'UPDATE',
          idea: 'Without <code>WHERE</code>, <code>UPDATE</code> changes <strong>every row in the table</strong>.',
          analogy: 'A correction meant for one form, applied to every form in the folder.',
          explain: `<p>PostgreSQL does not warn you. It assumes you meant it. On a real database this mistake is a serious incident, so always write the <code>WHERE</code> first.</p>`,
          setup: RULED,
          controls: [{ key: 'where', label: 'WHERE clause', type: 'select', value: 0, options: [{ label: 'left out', value: '' }, { label: 'WHERE empno = 101', value: ' WHERE empno = 101' }] }],
          render: v => ({ code: `-- Everyone or only one person?\nUPDATE emp.emp SET sal = 1.00${v.where};` }),
          tip: 'Here, every Run starts from a clean copy. On a real server there is no such safety net.'
        },
        {
          title: 'DELETE: remove a row', file: 'DELETE',
          idea: '<code>DELETE</code> removes rows. <code>WHERE</code> says which ones.',
          analogy: 'Taking one form out of the folder and shredding it. The folder stays.',
          explain: `<ul><li><code>DELETE</code> removes rows, and the table stays</li><li><code>DROP TABLE</code> removes the table itself</li></ul><p>As with <code>UPDATE</code>, leaving out <code>WHERE</code> removes every row.</p>`,
          setup: setup(BASE, SEED.dept),
          controls: [{ key: 'no', label: 'deptno', type: 'select', value: 2, options: ['1000', '2000', '3000', '4000'] }],
          visual: anatomy([['DELETE FROM emp.dept', 'which table', C.cmd], ['WHERE deptno = 3000', 'which rows', C.op]]),
          render: v => ({ code: `-- Delete a dept\nDELETE FROM emp.dept WHERE deptno = ${v.no};` })
        },
        {
          title: 'DELETE an employee', file: 'DELETE',
          idea: 'Use the primary key in <code>WHERE</code> to remove exactly one row.',
          explain: `<p><code>empno</code> is unique, so this can never match more than one employee. Compare that with a condition like <code>ename = 'John Doe'</code>, which could match two people with the same name.</p>`,
          setup: RULED,
          code: `-- Remove an employee\nDELETE FROM emp.emp\nWHERE empno = 101;`
        },
        {
          title: 'When a rule blocks a DELETE', file: 'DELETE',
          idea: 'You cannot delete a row that another table still points to.',
          analogy: 'You cannot close a department while people still work in it. Move them out first.',
          explain: `<p>John Doe works in department <code>1000</code>, so deleting that department fails. The fix is the right order: remove the employee first, then the department.</p>`,
          setup: RULED,
          code: `-- Blocked: employee 101 is still in this department\nDELETE FROM emp.dept WHERE deptno = 1000;\n\n-- Remove the employee first\nDELETE FROM emp.emp WHERE empno = 101;\n\n-- Now the department can go\nDELETE FROM emp.dept WHERE deptno = 1000;`
        },
        {
          title: 'DML on one page', file: 'Recap',
          idea: 'You can now add, change and remove data, and you know what PostgreSQL refuses and why.',
          explain: `<p>This script has one of everything. Change it and make it your own.</p>`,
          setup: RULED,
          visual: recapTable([
            ['add a row', "INSERT INTO t (a, b) VALUES (1, 'x');"],
            ['add many rows', 'INSERT INTO t (a) VALUES (1), (2);'],
            ['copy rows', 'INSERT INTO t2 (a) SELECT a FROM t;'],
            ['change rows', 'UPDATE t SET a = 2 WHERE b = 1;'],
            ['remove rows', 'DELETE FROM t WHERE a = 1;']
          ]),
          code: `INSERT INTO emp.dept (deptno, dname) VALUES (5000, 'MARKETING');\n\nUPDATE emp.emp SET deptno = 5000 WHERE empno = 102;\n\nDELETE FROM emp.dept WHERE deptno = 2000;`
        }
      ]
    }
  };
  const ORDER = Object.keys(DECKS);

  // ---------- Progress ----------
  const STORE_KEY = 'tinitiate-sql-course-v1';
  let seen = {};
  try { seen = JSON.parse(localStorage.getItem(STORE_KEY)) || {}; } catch (e) { seen = {}; }
  ORDER.forEach(k => { seen[k] = Array.isArray(seen[k]) ? seen[k].filter(i => i < DECKS[k].slides.length) : []; });
  const save = () => { try { localStorage.setItem(STORE_KEY, JSON.stringify(seen)); } catch (e) { /* storage unavailable */ } };

  const values = {};
  let deck = null, idx = 0, ready = false, playing = false, speed = 12000, autoStart = 0, autoRaf = null;
  const $ = id => document.getElementById(id);

  function valuesFor(i) {
    if (!values[i]) {
      values[i] = {};
      (DECKS[deck].slides[i].controls || []).forEach(c => { values[i][c.key] = c.value; });
    }
    return values[i];
  }
  function resolved(i) {
    const vals = valuesFor(i), out = {};
    (DECKS[deck].slides[i].controls || []).forEach(c => {
      const v = vals[c.key];
      out[c.key] = c.type === 'select' ? (typeof c.options[v] === 'string' ? c.options[v] : c.options[v].value) : v;
    });
    return out;
  }
  function compute(i) {
    const s = DECKS[deck].slides[i];
    const r = s.render ? s.render(resolved(i)) : { code: s.code };
    return { code: r.code || '', visual: r.visual != null ? r.visual : (s.visual || '') };
  }

  // ---------- Split a script into statements, the way psql does ----------
  // Knows quotes, $$ strings and comments, so a ; inside any of those does not end a statement.
  function splitSql(src) {
    const out = [];
    let i = 0, start = -1;
    // A statement starts at its first real character, so leading comments do not shift error line numbers.
    const push = end => {
      if (start >= 0) out.push({ sql: src.slice(start, end), offset: start });
      start = -1;
    };
    while (i < src.length) {
      const ch = src[i], two = src.slice(i, i + 2);
      if (two === '--') { const e = src.indexOf('\n', i); i = e < 0 ? src.length : e; continue; }
      if (two === '/*') {
        let depth = 1; i += 2;
        while (i < src.length && depth) {
          if (src.startsWith('/*', i)) { depth++; i += 2; } else if (src.startsWith('*/', i)) { depth--; i += 2; } else i++;
        }
        continue;
      }
      if (ch === "'" || ch === '"') {
        if (start < 0) start = i;
        i++;
        while (i < src.length) {
          if (src[i] === ch) { if (src[i + 1] === ch) i += 2; else { i++; break; } } else i++;
        }
        continue;
      }
      if (ch === '$') {
        const m = src.slice(i).match(/^\$[A-Za-z_]*\$/);
        if (m) {
          if (start < 0) start = i;
          const e = src.indexOf(m[0], i + m[0].length);
          i = e < 0 ? src.length : e + m[0].length;
          continue;
        }
      }
      if (ch === ';') { push(i); i++; continue; }
      if (start < 0 && !/\s/.test(ch)) start = i;
      i++;
    }
    push(src.length);
    return out;
  }
  const lineOf = (src, offset) => src.slice(0, offset).split('\n').length;

  // ---------- Real PostgreSQL: PGlite (PostgreSQL on WebAssembly) in a Web Worker ----------
  // A classic worker with a dynamic import: a module worker is refused on file:// pages.
  const PGLITE_URL = 'https://cdn.jsdelivr.net/npm/@electric-sql/pglite@0.5.10/dist/index.js';
  const ROW_CAP = 200, SNAP_ROWS = 50;
  const WORKER_SRC = `
let db, raw, notices = [];
const opts = () => ({ rowMode: 'array', parsers: raw, onNotice: n => notices.push(n.message) });
const q = async sql => (await db.exec(sql, opts())).pop().rows;
const qi = s => '"' + String(s).replace(/"/g, '""') + '"';
const USER_NS = "n.nspname NOT LIKE 'pg\\\\_%' AND n.nspname <> 'information_schema'";

const boot = (async () => {
  const { PGlite } = await import('${PGLITE_URL}');
  db = new PGlite();
  await db.waitReady;
  // Keep values exactly as PostgreSQL prints them (5000.00, not 5000).
  raw = Object.fromEntries(Object.keys(db.parsers).map(k => [k, x => x]));
  const v = await q('SHOW server_version');
  postMessage({ t: 'ready', v: v[0][0] });
})().catch(e => postMessage({ t: 'fail', s: String(e) }));

// Every Run starts from a clean database, so nothing a student does can carry over.
async function reset() {
  if (db.isInTransaction()) await db.exec('ROLLBACK');
  await db.exec('DISCARD ALL');
  for (const [s] of await q('SELECT n.nspname FROM pg_catalog.pg_namespace n WHERE ' + USER_NS)) await db.exec('DROP SCHEMA ' + qi(s) + ' CASCADE');
  await db.exec('CREATE SCHEMA public');
  for (const [r] of await q("SELECT rolname FROM pg_catalog.pg_roles WHERE rolname NOT LIKE 'pg\\\\_%' AND rolname <> current_user")) await db.exec('DROP ROLE ' + qi(r));
  for (const [d] of await q("SELECT datname FROM pg_catalog.pg_database WHERE datname NOT IN ('postgres', 'template0', 'template1')")) await db.exec('DROP DATABASE ' + qi(d));
}

async function snapshot() {
  if (db.isInTransaction()) await db.exec('ROLLBACK');
  await db.exec('RESET ROLE');
  const schemas = await q('SELECT n.nspname, pg_catalog.pg_get_userbyid(n.nspowner) FROM pg_catalog.pg_namespace n WHERE ' + USER_NS + ' ORDER BY n.oid');
  const roles = (await q("SELECT rolname FROM pg_catalog.pg_roles WHERE rolname NOT LIKE 'pg\\\\_%' AND rolname <> current_user ORDER BY 1")).map(r => r[0]);
  const tabs = await q("SELECT c.oid::int, n.nspname, c.relname FROM pg_catalog.pg_class c JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace WHERE c.relkind IN ('r', 'p') AND " + USER_NS + ' ORDER BY c.oid');
  const tables = [];
  for (const [oid, schema, name] of tabs) {
    const cols = (await q('SELECT a.attnum, a.attname, pg_catalog.format_type(a.atttypid, a.atttypmod) FROM pg_catalog.pg_attribute a WHERE a.attrelid = ' + oid + ' AND a.attnum > 0 AND NOT a.attisdropped ORDER BY a.attnum'))
      .map(([n, nm, type]) => ({ n: +n, name: nm, type }));
    const cons = await q("SELECT contype, pg_catalog.array_to_string(conkey, ','), confrelid::regclass::text FROM pg_catalog.pg_constraint WHERE conrelid = " + oid + " AND contype IN ('p', 'f')");
    const pk = (cons.find(c => c[0] === 'p') || [0, ''])[1].split(',').filter(Boolean).map(Number);
    const fks = cons.filter(c => c[0] === 'f').map(c => ({ cols: c[1].split(',').map(Number), ref: c[2] }));
    const from = qi(schema) + '.' + qi(name);
    let rows = [], count = 0;
    if (cols.length) {
      const order = (pk.length ? pk.map(n => cols.find(c => c.n === n)) : [cols[0]]).map(c => 'x.' + qi(c.name)).join(', ');
      rows = await q('SELECT ' + cols.map(c => 'x.' + qi(c.name) + '::text').join(', ') + ' FROM ' + from + ' AS x ORDER BY ' + order + ' LIMIT ${SNAP_ROWS}');
      count = +(await q('SELECT count(*) FROM ' + from))[0][0];
    }
    tables.push({ oid, schema, name, cols, pk, fks, rows, count });
  }
  return { schemas, roles, tables };
}

onmessage = async ({ data }) => {
  await boot;
  if (!db) return;
  try {
    await reset();
    if (data.setup) await db.exec(data.setup);
    const before = await snapshot();
    const results = [];
    for (const st of data.stmts) {
      notices = [];
      try {
        const r = (await db.exec(st.sql, opts())).pop() || {};
        results.push({ offset: st.offset, sql: st.sql, command: r.command || '', affected: r.affectedRows || 0,
          fields: (r.fields || []).map(f => f.name), rows: (r.rows || []).slice(0, ${ROW_CAP}), total: (r.rows || []).length, hasRows: !!(r.fields && r.fields.length), notices });
      } catch (e) {
        results.push({ offset: st.offset, sql: st.sql, notices, error: { code: e.code, message: e.message, detail: e.detail, hint: e.hint, position: +e.position || 0 } });
      }
    }
    const open = db.isInTransaction();
    const after = await snapshot();
    postMessage({ t: 'done', id: data.id, results, before, after, open });
  } catch (e) {
    postMessage({ t: 'broken', id: data.id, s: String(e.message || e) });
  }
};`;

  const engine = { worker: null, state: 'idle', label: 'PostgreSQL: not started', busy: false, sent: 0, want: null, stopTimer: null, watchdog: null, seq: 0 };
  function engineStatus(state, label) {
    engine.state = state; engine.label = label;
    const el = $('py-engine');
    if (el) { el.dataset.state = state; el.textContent = label; }
  }
  function startEngine() {
    if (engine.worker) return;
    engineStatus('loading', 'PostgreSQL: starting…');
    try {
      engine.worker = new Worker(URL.createObjectURL(new Blob([WORKER_SRC], { type: 'text/javascript' })));
    } catch (e) { engineFailed(); return; }
    engine.worker.onmessage = ({ data }) => {
      if (data.t === 'ready') {
        engineStatus('ready', 'PostgreSQL ' + data.v + ' ready');
        pump();
      } else if (data.t === 'done') {
        finishJob();
        if (engine.want && data.id === engine.want.id) { showResults(data, engine.want); engine.want = null; }
        pump();
      } else if (data.t === 'broken') {
        // The student's script left the database in a state reset cannot clear: start a new one.
        finishJob();
        restartEngine();
      } else if (data.t === 'fail') {
        engineFailed();
      }
    };
    engine.worker.onerror = engineFailed;
  }
  function engineFailed() {
    if (engine.worker) engine.worker.terminate();
    engine.worker = null;
    finishJob();
    engine.want = null;
    engineStatus('fail', 'PostgreSQL: could not load');
    termClear();
    termLine('sql-res err', 'Could not start PostgreSQL in this browser. Check your internet connection, then press Run again.');
    const box = $('sql-db');
    if (box) box.innerHTML = '';
  }
  function restartEngine() {
    if (engine.worker) engine.worker.terminate();
    engine.worker = null;
    finishJob();
    startEngine();
  }
  function finishJob() {
    engine.busy = false;
    clearTimeout(engine.stopTimer);
    clearTimeout(engine.watchdog);
    setRunButton(false);
  }
  function pump() {
    if (engine.state !== 'ready' || engine.busy || !engine.want || !engine.worker) return;
    const job = engine.want;
    engine.busy = true;
    engine.stopTimer = setTimeout(() => setRunButton(true), 500);
    engine.worker.postMessage({ id: job.id, setup: job.setup, stmts: job.stmts });
  }
  function runCode() {
    if (engine.busy && engine.want) return stopRun();
    submit();
  }
  function submit() {
    const code = editorGet();
    engine.want = { id: ++engine.seq, setup: DECKS[deck].slides[idx].setup || '', stmts: splitSql(code), code };
    clearMarks();
    termClear();
    if (engine.state === 'fail' || !engine.worker) {
      termLine('note', 'Starting PostgreSQL in your browser… The first time takes a few seconds.');
      startEngine();
    } else if (engine.state === 'loading') {
      termLine('note', 'Starting PostgreSQL in your browser… The first time takes a few seconds.');
    } else if (engine.busy) {
      // A long query from an earlier slide is still running: give it a moment, then replace the engine.
      clearTimeout(engine.watchdog);
      engine.watchdog = setTimeout(() => { if (engine.busy) restartEngine(); }, 1500);
    } else {
      pump();
    }
  }
  function stopRun() {
    engine.want = null;
    restartEngine();
    termClear();
    termLine('sql-res err', 'Stopped.');
  }

  // ---------- Plain-English help for the errors students will meet ----------
  function plainError(e) {
    const map = {
      23505: 'A row with this key already exists, and a primary key must be unique.',
      22001: 'The text is longer than the column allows.',
      22003: 'The number is too big for this column.',
      '22P02': 'This value is the wrong kind for the column, like text going into a number column.',
      '22007': 'This is not a valid date. Write dates as YYYY-MM-DD.',
      22008: 'This is not a valid date. Write dates as YYYY-MM-DD.',
      23502: 'This column must have a value, and it was left empty.',
      42601: 'PostgreSQL could not read this. Check the spelling, commas, brackets and quotes near the position shown.',
      '42P01': 'No table with this name exists here. Check the name and the schema.',
      42703: 'This table has no column with that name.',
      '42P07': 'A table with this name already exists.',
      '42P06': 'A schema with this name already exists.',
      '3F000': 'PostgreSQL cannot find that schema. Check the name, or create the schema first.',
      42710: 'This name is already taken.',
      42804: 'The value is the wrong type for this column.'
    };
    if (e.code === '42601' && /"\\"/.test(e.message)) {
      return 'Commands that start with a backslash, like \\dt or \\c, belong to the psql tool. They are not SQL, so they do not work here.';
    }
    if (e.code === '23503') {
      return /still referenced/.test(e.detail || '')
        ? 'Rows in another table still point to this row. Change or remove those rows first.'
        : 'This value does not exist in the table it points to.';
    }
    return map[e.code] || '';
  }

  // ---------- Output: one entry per statement, like psql ----------
  function termClear() {
    const term = $('py-term');
    if (term) term.innerHTML = '<span class="prompt">$ psql -d postgres -f demo.sql</span>';
  }
  function termLine(cls, text) {
    const term = $('py-term');
    if (!term) return;
    const el = document.createElement('div');
    el.className = cls;
    el.textContent = text;
    term.appendChild(el);
  }
  const plural = (n, one, many) => `${n} ${n === 1 ? one : (many || one + 's')}`;
  function statusFor(r) {
    const words = r.sql.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/--.*$/gm, ' ').trim().split(/\s+/).map(w => w.toUpperCase());
    const n = r.affected;
    switch (r.command) {
      case 'INSERT': return { tag: `INSERT 0 ${n}`, note: plural(n, 'row') + ' added' };
      case 'UPDATE': return { tag: `UPDATE ${n}`, note: plural(n, 'row') + ' changed' };
      case 'DELETE': return { tag: `DELETE ${n}`, note: plural(n, 'row') + ' removed' };
      case 'SELECT': return { tag: `SELECT ${r.total}`, note: '' };
      case 'CREATE': case 'ALTER': case 'DROP': {
        const kind = words[1] === 'USER' ? 'ROLE' : (words[1] === 'OR' ? words[3] : words[1]);
        return { tag: `${r.command} ${kind}`, note: '' };
      }
      default: return { tag: r.command || words[0] || '', note: '' };
    }
  }
  const cellHTML = v => (v == null ? '<span class="sql-null">NULL</span>' : esc(v));
  function gridHTML(r) {
    const more = r.total > r.rows.length ? `<div class="sql-more">Showing the first ${r.rows.length} of ${r.total} rows.</div>` : '';
    const empty = r.total === 0 ? `<tr><td colspan="${r.fields.length}" class="sql-empty">(0 rows)</td></tr>` : '';
    return `<div class="sql-grid-wrap"><table class="sql-grid"><thead><tr>${r.fields.map(f => `<th>${esc(f)}</th>`).join('')}</tr></thead><tbody>${r.rows.map((row, k) => `<tr style="animation-delay:${Math.min(k, 12) * 0.03}s">${row.map(v => `<td>${cellHTML(v)}</td>`).join('')}</tr>`).join('')}${empty}</tbody></table></div>${more}`;
  }
  function errorHTML(r, code) {
    const e = r.error;
    const at = r.offset + Math.max(e.position - 1, 0);
    const line = lineOf(code, at);
    markLine(line - 1);
    const src = code.split('\n')[line - 1] || '';
    const col = at - code.lastIndexOf('\n', at - 1) - 1;
    const pointer = e.position ? `<div class="sql-err-src">LINE ${line}: ${esc(src)}\n${' '.repeat(`LINE ${line}: `.length + col)}^</div>` : '';
    const why = plainError(e);
    return `<div class="sql-res err"><div>ERROR:  ${esc(e.message)}</div>${e.detail ? `<div>DETAIL:  ${esc(e.detail)}</div>` : ''}${e.hint ? `<div>HINT:  ${esc(e.hint)}</div>` : ''}${pointer}${why ? `<div class="sql-why"><b>In plain English:</b> ${esc(why)}</div>` : ''}<div class="sql-at">line ${line} of your code</div></div>`;
  }
  function showResults(data, job) {
    const term = $('py-term');
    if (!term) return;
    termClear();
    let html = '';
    data.results.forEach(r => {
      html += r.notices.map(n => `<div class="sql-res note">NOTICE:  ${esc(n)}</div>`).join('');
      if (r.error) { html += errorHTML(r, job.code); return; }
      const s = statusFor(r);
      if (r.hasRows) html += gridHTML(r);
      html += `<div class="sql-res ok"><span class="sql-tag">${esc(s.tag)}</span>${s.note ? `<span class="sql-note">${esc(s.note)}</span>` : ''}</div>`;
    });
    if (!data.results.length) html = '<div class="note">There is nothing to run. Type some SQL and press Run.</div>';
    if (data.open) html += '<div class="sql-res note">A transaction was still open at the end, so it was rolled back. Add COMMIT; to keep the changes.</div>';
    term.insertAdjacentHTML('beforeend', html);
    renderDb(data.before, data.after);
  }

  // ---------- "Your database" panel: compares the database before and after the run ----------
  function diffRows(b, a) {
    const cols = a.cols.filter(c => b.cols.some(x => x.n === c.n));
    const bi = n => b.cols.findIndex(x => x.n === n), ai = n => a.cols.findIndex(x => x.n === n);
    const keyN = () => {
      if (a.pk.length && a.pk.every(n => cols.some(c => c.n === n))) return a.pk;
      if (!cols.length) return null;
      const first = cols[0].n;
      const uniq = (rows, k) => new Set(rows.map(r => r[k])).size === rows.length;
      return uniq(b.rows, bi(first)) && uniq(a.rows, ai(first)) ? [first] : null;
    };
    const kn = keyN();
    const keyA = kn ? r => JSON.stringify(kn.map(n => r[ai(n)])) : r => JSON.stringify(cols.map(c => r[ai(c.n)]));
    const keyB = kn ? r => JSON.stringify(kn.map(n => r[bi(n)])) : r => JSON.stringify(cols.map(c => r[bi(c.n)]));
    const pool = new Map();
    b.rows.forEach(r => { const k = keyB(r); if (!pool.has(k)) pool.set(k, []); pool.get(k).push(r); });
    const rows = a.rows.map(r => {
      const hit = pool.get(keyA(r));
      if (!hit || !hit.length) return { state: 'add', row: r, was: null, changed: new Set() };
      const was = hit.shift();
      return { state: '', row: r, was, changed: new Set(cols.filter(c => was[bi(c.n)] !== r[ai(c.n)]).map(c => c.n)) };
    });
    const gone = [...pool.values()].flat();
    return { rows, gone };
  }
  function tableCard(a, b) {
    const dropped = !a;
    const t = a || b;
    const shownAdded = !b;
    const beforeCol = n => (b ? b.cols.find(c => c.n === n) : null);
    const afterCol = n => (a ? a.cols.find(c => c.n === n) : null);
    const pk = new Set(t.pk), fk = new Map();
    t.fks.forEach(f => f.cols.forEach(n => fk.set(n, f.ref)));
    const allCols = dropped ? b.cols.map(c => ({ c, st: 'gone' })) : [
      ...a.cols.map(c => {
        const was = beforeCol(c.n);
        return { c, was, st: !b ? '' : (!was ? 'add' : ((was.name !== c.name || was.type !== c.type) ? 'chg' : '')) };
      }),
      ...(b ? b.cols.filter(c => !afterCol(c.n)).map(c => ({ c, st: 'gone' })) : [])
    ].sort((x, y) => x.c.n - y.c.n);

    const d = a && b ? diffRows(b, a) : null;
    let added = 0, changed = 0, removed = 0;
    const cellsFor = (row, was, ch, rowState) => allCols.map(({ c, st }) => {
      const src = st === 'gone' ? was : row;
      const i = (st === 'gone' ? (b ? b.cols : []) : (a ? a.cols : [])).findIndex(x => x.n === c.n);
      const v = src ? src[i] : undefined;
      const cls = st === 'gone' ? 'gone' : (ch && ch.has(c.n) ? 'chg' : (st === 'add' ? 'add' : ''));
      return `<td class="${cls}">${rowState === 'skip' ? '' : cellHTML(v)}</td>`;
    }).join('');
    let body = '';
    if (dropped) {
      removed = b.count;
      body = b.rows.map(r => `<tr class="gone">${b.cols.map((c, i) => `<td>${cellHTML(r[i])}</td>`).join('')}</tr>`).join('');
    } else if (d) {
      body = d.rows.map(r => {
        if (r.state === 'add') added++;
        if (r.changed.size) changed++;
        return `<tr class="${r.state}">${cellsFor(r.row, r.was, r.changed)}</tr>`;
      }).join('');
      body += d.gone.map(r => {
        removed++;
        return `<tr class="gone">${allCols.map(({ c }) => { const i = b.cols.findIndex(x => x.n === c.n); return `<td>${i < 0 ? '' : cellHTML(r[i])}</td>`; }).join('')}</tr>`;
      }).join('');
    } else {
      added = a.rows.length;
      body = a.rows.map(r => `<tr class="add">${r.map(v => `<td>${cellHTML(v)}</td>`).join('')}</tr>`).join('');
    }
    if (!body) body = `<tr><td colspan="${allCols.length}" class="sql-empty">no rows</td></tr>`;

    const colChanged = allCols.some(x => x.st);
    const ruleSig = x => JSON.stringify([x.pk, x.fks]);
    const ruleChanged = !!(a && b && ruleSig(a) !== ruleSig(b));
    const isChanged = dropped || !b || colChanged || added || changed || removed || ruleChanged;
    const badges = [
      dropped ? '<span class="sql-badge gone">dropped</span>' : '',
      !b ? '<span class="sql-badge add">new table</span>' : '',
      b && a && added ? `<span class="sql-badge add">+${plural(added, 'row')}</span>` : '',
      changed ? `<span class="sql-badge chg">${plural(changed, 'row')} changed</span>` : '',
      a && removed ? `<span class="sql-badge gone">&minus;${plural(removed, 'row')}</span>` : '',
      a && b && allCols.some(x => x.st === 'add') ? '<span class="sql-badge add">column added</span>' : '',
      a && b && allCols.some(x => x.st === 'chg') ? '<span class="sql-badge chg">column changed</span>' : '',
      a && b && allCols.some(x => x.st === 'gone') ? '<span class="sql-badge gone">column dropped</span>' : '',
      ruleChanged ? '<span class="sql-badge chg">rules changed</span>' : ''
    ].join('');
    const more = t.count > t.rows.length ? `<div class="sql-more">Showing ${t.rows.length} of ${t.count} rows.</div>` : '';
    const head = allCols.map(({ c, st, was }) => {
      const key = pk.has(c.n) ? '<span class="sql-key">PK</span>' : '';
      const fkey = fk.has(c.n) ? `<span class="sql-key fk" title="must exist in ${esc(fk.get(c.n))}">FK</span>` : '';
      const old = st === 'chg' && was && was.name !== c.name ? `<s>${esc(was.name)}</s> ` : '';
      const oldType = st === 'chg' && was && was.type !== c.type ? `<s>${esc(was.type)}</s> ` : '';
      return `<th class="${st}"><span class="n">${old}${esc(c.name)}${key}${fkey}</span><span class="t">${oldType}${esc(c.type)}</span></th>`;
    }).join('');
    return {
      changed: !!isChanged,
      html: open => `<details class="sql-tbl${dropped ? ' dropped' : ''}"${open ? ' open' : ''}><summary><span class="sql-tbl-name"><span class="s">${esc(t.schema)}.</span>${esc(t.name)}</span><span class="sql-tbl-count">${plural(t.count, 'row')}</span>${badges}</summary><div class="sql-grid-wrap"><table class="sql-grid"><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table></div>${more}</details>`
    };
  }
  function renderDb(before, after) {
    const box = $('sql-db');
    if (!box) return;
    const findBefore = t => before.tables.find(x => x.oid === t.oid) || before.tables.find(x => x.schema === t.schema && x.name === t.name);
    const cards = after.tables.map(t => tableCard(t, findBefore(t) || null));
    before.tables.filter(b => !after.tables.some(t => t.oid === b.oid || (t.schema === b.schema && t.name === b.name))).forEach(b => cards.push(tableCard(null, b)));
    const anyChange = cards.some(c => c.changed);
    const beforeSchemas = new Map(before.schemas), afterSchemas = new Set(after.schemas.map(s => s[0]));
    const schemaChips = [
      ...after.schemas.filter(([s]) => s !== 'public' || after.tables.some(t => t.schema === 'public')).map(([s, owner]) => {
        const st = !beforeSchemas.has(s) ? 'add' : (beforeSchemas.get(s) !== owner ? 'chg' : '');
        return `<span class="sql-chip ${st}">schema <b>${esc(s)}</b> &middot; owner ${esc(owner)}</span>`;
      }),
      ...before.schemas.filter(([s]) => !afterSchemas.has(s)).map(([s]) => `<span class="sql-chip gone">schema <b>${esc(s)}</b></span>`),
      ...after.roles.map(r => `<span class="sql-chip ${before.roles.includes(r) ? '' : 'add'}">user <b>${esc(r)}</b></span>`)
    ].join('');
    const tables = cards.map((c, i) => c.html(c.changed || (!anyChange && i < 2))).join('');
    const sameMeta = JSON.stringify([before.schemas, before.roles]) === JSON.stringify([after.schemas, after.roles]);
    const unchanged = !anyChange && sameMeta && before.tables.length ? '<div class="sql-unchanged">This run did not change the database.</div>' : '';
    box.innerHTML = unchanged + (schemaChips ? `<div class="sql-chips">${schemaChips}</div>` : '') + (tables || '<div class="sql-empty-db">No tables yet.</div>');
  }

  // ---------- Run / stop button ----------
  function setRunButton(running) {
    const b = $('py-run');
    if (!b) return;
    b.innerHTML = running ? '&#9632; Stop' : '&#9654; Run';
    b.classList.toggle('stop', running);
    b.title = running ? 'Stop the query' : 'Run the code (Ctrl+Enter)';
  }

  // ---------- Code editor (CodeMirror 5, falls back to a plain textarea) ----------
  let cm = null, edited = false, errLines = [];
  function mountEditor(code) {
    const host = $('py-editor');
    edited = false;
    errLines = [];
    if (window.CodeMirror) {
      cm = window.CodeMirror(host, {
        value: code, mode: 'text/x-pgsql', theme: 'tinitiate', lineNumbers: true, lineWrapping: true, indentUnit: 4, tabSize: 4,
        matchBrackets: true, viewportMargin: Infinity, spellcheck: false, autocorrect: false, autocapitalize: false,
        extraKeys: {
          'Ctrl-Enter': runCode, 'Cmd-Enter': runCode,
          Tab: c => (c.somethingSelected() ? c.indentSelection('add') : c.replaceSelection('    ', 'end')),
          'Shift-Tab': c => c.indentSelection('subtract')
        }
      });
      cm.on('change', (_, ch) => { clearMarks(); if (ch.origin !== 'setValue') markEdited(); });
    } else {
      cm = null;
      host.innerHTML = '<textarea class="py-code-fallback" spellcheck="false" aria-label="SQL code"></textarea>';
      const ta = host.querySelector('textarea');
      ta.value = code;
      ta.rows = Math.max(4, code.split('\n').length + 1);
      ta.addEventListener('input', markEdited);
      ta.addEventListener('keydown', e => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); runCode(); } });
    }
  }
  const editorGet = () => (cm ? cm.getValue() : ($('py-editor')?.querySelector('textarea')?.value || ''));
  function editorSet(code) {
    if (cm) cm.setValue(code);
    else { const ta = $('py-editor')?.querySelector('textarea'); if (ta) ta.value = code; }
    edited = false;
    $('py-edited').hidden = true;
  }
  function markLine(n) {
    if (!cm) return;
    errLines.push(cm.addLineClass(n, 'background', 'sql-err-line'));
  }
  function clearMarks() {
    if (cm) errLines.forEach(h => cm.removeLineClass(h, 'background', 'sql-err-line'));
    errLines = [];
  }
  function markEdited() {
    if (edited) return;
    edited = true;
    $('py-edited').hidden = false;
    termClear();
    termLine('note', 'You changed the code. Press ▶ Run (or Ctrl+Enter) to see the new result.');
  }

  // ---------- Slide rendering ----------
  function controlHTML(c, v, i) {
    const id = 'pyc-' + i;
    let input;
    if (c.type === 'select') {
      input = `<select id="${id}">` + c.options.map((o, k) => `<option value="${k}"${k === v ? ' selected' : ''}>${esc(typeof o === 'string' ? o : o.label)}</option>`).join('') + '</select>';
    } else if (c.type === 'range') {
      input = `<input type="range" id="${id}" min="${c.min}" max="${c.max}" step="1" value="${v}">`;
    } else if (c.type === 'number') {
      input = `<input type="number" id="${id}" step="1" value="${v}">`;
    } else {
      input = `<input type="text" id="${id}" value="${esc(v)}" spellcheck="false" autocomplete="off">`;
    }
    const extra = c.type === 'range' ? ` = <span class="py-range-val" id="${id}-val">${v}</span>` : '';
    return `<div class="py-field"><label for="${id}">${esc(c.label)}${extra}</label>${input}</div>`;
  }

  let runTimer = null;
  function renderSlide(dir) {
    clearTimeout(runTimer);
    const d = DECKS[deck], i = idx, s = d.slides[i], n = d.slides.length;
    const r = compute(i);
    const vals = valuesFor(i);
    const nextKey = ORDER[ORDER.indexOf(deck) + 1];
    const controls = s.controls ? `<div class="py-controls"><span class="py-controls-label"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>Try it: change these and watch the code and the database</span>${s.controls.map((c, k) => controlHTML(c, vals[c.key], k)).join('')}</div>` : '';
    const finish = i === n - 1 ? `<div class="py-finish"><span>&#127881; You finished <strong>${esc(d.name)}</strong>!</span>${nextKey ? `<a class="py-btn primary" href="${DECKS[nextKey].page}">Next: ${esc(DECKS[nextKey].name)} &rarr;</a>` : '<a class="py-btn primary" href="index.html">Back to the SQL home &rarr;</a>'}</div>` : '';
    $('py-stage').innerHTML = `
      <div class="py-slide ${dir < 0 ? 'enter-prev' : (dir > 0 ? 'enter-next' : '')}">
        <div class="py-anim">
          <span class="py-eyebrow py-slide-kicker">${esc(d.short)} &bull; Slide ${i + 1} of ${n}</span>
          <h3 class="py-slide-title">${esc(s.title)}</h3>
          ${s.idea ? `<div class="py-idea"><span class="py-idea-tag">In plain English</span><span class="py-idea-text">${s.idea}</span></div>` : ''}
          ${s.analogy ? `<div class="py-analogy"><span class="py-analogy-icon" aria-hidden="true">&#128161;</span><span><strong>Think of it like this:</strong> ${s.analogy}</span></div>` : ''}
          ${s.explain ? `<div class="py-slide-explain">${s.explain}</div>` : ''}
          ${controls}
          <div class="py-visual" id="py-visual">${r.visual}</div>
          ${s.tip ? `<div class="py-tip"><span style="color:var(--deck-accent);font-weight:800;white-space:nowrap;">TRY THIS</span><span>${s.tip}</span></div>` : ''}
          ${finish}
        </div>
        <div class="py-code-col">
          <div class="py-panel">
            <div class="py-panel-head"><span><span class="py-lights"><i></i><i></i><i></i></span>Your code &bull; demo.sql <span class="py-edited" id="py-edited" hidden>edited</span></span>
              <span class="py-panel-actions">
                <button type="button" class="py-mini-btn" id="py-reset-code" title="Put back the original code for this slide">&#8634; Reset</button>
                <button type="button" class="py-mini-btn" id="py-copy">Copy</button>
                <button type="button" class="py-mini-btn run" id="py-run" title="Run the code (Ctrl+Enter)">&#9654; Run</button>
              </span></div>
            <div class="py-editor" id="py-editor"></div>
            <div class="py-editor-hint">&#9998; Click the code to edit it: change values, names or add your own lines. Press <span class="py-kbd">Ctrl</span>+<span class="py-kbd">Enter</span> to run.</div>
          </div>
          <div class="py-panel">
            <div class="py-panel-head"><span>WHAT POSTGRESQL SAYS</span>
              <span class="py-engine" id="py-engine" data-state="${engine.state}">${esc(engine.label)}</span></div>
            <div class="py-term sql-term" id="py-term"></div>
          </div>
          <div class="py-panel">
            <div class="py-panel-head"><span>YOUR DATABASE AFTER THIS RUN</span>
              <span class="sql-legend"><i class="add"></i>new <i class="chg"></i>changed <i class="gone"></i>removed</span></div>
            <div class="sql-db" id="sql-db"></div>
          </div>
        </div>
      </div>`;

    (s.controls || []).forEach((c, k) => {
      const el = $('pyc-' + k);
      el.addEventListener(c.type === 'select' ? 'change' : 'input', () => {
        if (c.type === 'select') vals[c.key] = +el.value;
        else if (c.type === 'range' || c.type === 'number') vals[c.key] = toInt(el.value);
        else vals[c.key] = el.value;
        if (c.type === 'range') $('pyc-' + k + '-val').textContent = vals[c.key];
        const nr = compute(i);
        editorSet(nr.code);
        $('py-visual').innerHTML = nr.visual;
        clearTimeout(runTimer);
        runTimer = setTimeout(submit, 250);
      });
    });
    mountEditor(r.code);
    $('py-run').addEventListener('click', runCode);
    $('py-reset-code').addEventListener('click', () => { delete values[i]; renderSlide(0); });
    $('py-copy').addEventListener('click', e => {
      const btn = e.currentTarget;
      try { navigator.clipboard.writeText(editorGet()).then(() => { btn.textContent = 'Copied'; setTimeout(() => { btn.textContent = 'Copy'; }, 1400); }); } catch (err) { /* clipboard unavailable */ }
    });
    setRunButton(false);
    termClear();
    // There is no stored output: every slide shows what the real database returns.
    runTimer = setTimeout(() => { if (idx === i && !edited) submit(); }, 300);

    if (!seen[deck].includes(i)) { seen[deck].push(i); save(); }
    renderChrome();
    renderModuleDash();
  }

  function renderChrome() {
    const d = DECKS[deck], i = idx, n = d.slides.length;
    $('py-counter').innerHTML = `<strong>${String(i + 1).padStart(2, '0')}</strong> / ${String(n).padStart(2, '0')}`;
    $('py-progress').style.width = ((i + 1) / n * 100) + '%';
    $('py-first').disabled = $('py-prev').disabled = i === 0;
    $('py-last').disabled = $('py-next').disabled = i === n - 1;
    const seenSet = new Set(seen[deck]);
    $('py-dots').innerHTML = d.slides.map((s, k) => `<button type="button" class="py-dot${k === i ? ' on' : ''}${seenSet.has(k) ? ' seen' : ''}" data-k="${k}" title="${esc(s.title)}" aria-label="Slide ${k + 1}: ${esc(s.title)}"></button>`).join('');
    $('py-outline').innerHTML = `<div class="py-outline-title">All ${n} slides</div>` + d.slides.map((s, k) =>
      `<button type="button" class="py-outline-item${k === i ? ' on' : ''}${seenSet.has(k) ? ' seen' : ''}" data-k="${k}"${k === i ? ' aria-current="step"' : ''}><span class="num">${seenSet.has(k) && k !== i ? '&#10003;' : k + 1}</span><span class="lbl">${esc(s.title)}<small>${esc(s.file)}</small></span></button>`).join('');
    const active = $('py-outline').querySelector('.on');
    if (active) $('py-outline').scrollTop = active.offsetTop - $('py-outline').clientHeight / 2;
    if (ready) { try { history.replaceState(null, '', `#slide-${i + 1}`); } catch (e) { /* file:// or sandboxed */ } }
  }

  // ---------- Dashboards ----------
  function deckStats(k) {
    const d = DECKS[k], n = d.slides.length, c = seen[k].length;
    return { n, c, pct: Math.round(c / n * 100), mins: Math.round(n * 1.5) };
  }

  function renderModuleDash() {
    const d = DECKS[deck], st = deckStats(deck);
    const seenSet = new Set(seen[deck]);
    const firstUnseen = d.slides.findIndex((_, k) => !seenSet.has(k));
    $('py-stat-progress').textContent = st.pct + '%';
    $('py-stat-progress-bar').style.width = st.pct + '%';
    $('py-stat-opened').textContent = `${st.c} / ${st.n}`;
    $('py-continue').textContent = st.c === st.n ? 'Review from the start' : (st.c <= 1 ? 'Start learning' : `Continue at slide ${firstUnseen + 1}`);
    $('py-continue').dataset.k = st.c === st.n ? 0 : Math.max(0, firstUnseen);
    $('py-learn').innerHTML = d.slides.map((s, k) => `<button type="button" class="py-learn-item${seenSet.has(k) ? ' seen' : ''}" data-k="${k}" style="animation-delay:${Math.min(k * 0.03, 0.5)}s"><span class="num">${seenSet.has(k) ? '&#10003;' : k + 1}</span><span>${esc(s.title)}</span></button>`).join('');
  }

  function renderModulePage() {
    const d = DECKS[deck], st = deckStats(deck);
    document.querySelector('.py-wrap').style.setProperty('--deck-accent', d.accent);
    $('py-stat-slides').textContent = st.n;
    $('py-stat-time').textContent = '~' + st.mins + ' min';
    $('py-glossary').innerHTML = d.glossary.map(([t, m]) => `<div class="py-gloss"><b>${esc(t)}</b><p>${esc(m)}</p></div>`).join('');
    const k = ORDER.indexOf(deck), prevK = ORDER[k - 1], nextK = ORDER[k + 1];
    $('py-modnav').innerHTML =
      (prevK ? `<a href="${DECKS[prevK].page}" style="--mod-accent:${DECKS[prevK].accent}"><span>&larr; Previous module</span><strong>${esc(DECKS[prevK].name)}</strong></a>` : '<a href="index.html"><span>&larr; Back</span><strong>SQL home</strong></a>') +
      (nextK ? `<a class="next" href="${DECKS[nextK].page}" style="--mod-accent:${DECKS[nextK].accent}"><span>Next module &rarr;</span><strong>${esc(DECKS[nextK].name)}</strong></a>` : '<a class="next" href="index.html"><span>All done &rarr;</span><strong>SQL home</strong></a>');
  }

  function renderHome() {
    let seenTotal = 0, total = 0;
    $('py-dash-grid').innerHTML = ORDER.map((k, n) => {
      const d = DECKS[k], st = deckStats(k);
      seenTotal += st.c; total += st.n;
      const label = st.c === 0 ? 'Open dashboard' : (st.c === st.n ? 'Review' : 'Continue');
      return `<article class="py-mod-card" style="--mod-accent:${d.accent};">
        <div class="py-mod-head"><div class="py-mod-icon">${d.icon}</div><div><span class="py-mod-meta">Module ${n + 1}</span><h3 class="py-mod-title">${esc(d.name)}</h3></div></div>
        <p class="py-sub" style="font-size:0.88rem;">${esc(d.blurb)}</p>
        <div class="py-mod-topics">${d.slides.slice(1, 6).map(s => `<span class="py-chip">${esc(s.title)}</span>`).join('')}<span class="py-chip">+${st.n - 6} more</span></div>
        <span class="py-mod-meta">${st.n} slides &bull; about ${st.mins} minutes</span>
        <div class="py-meter" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${st.pct}" aria-label="${esc(d.name)} progress"><span style="width:${st.pct}%"></span></div>
        <div class="py-mod-foot"><span>${st.c} / ${st.n} slides opened &bull; ${st.pct}%</span><a class="py-btn" href="${d.page}" style="border-color:${d.accent}66;">${label} &rarr;</a></div>
      </article>`;
    }).join('');
    $('py-overall').textContent = Math.round(seenTotal / total * 100) + '%';
    $('py-seen-total').textContent = `${seenTotal} / ${total}`;
  }

  // ---------- Navigation + autoplay ----------
  function go(i, dir) {
    const n = DECKS[deck].slides.length;
    if (i < 0) i = n - 1;
    i = Math.max(0, Math.min(n - 1, i));
    const d = dir != null ? dir : (i >= idx ? 1 : -1);
    idx = i;
    renderSlide(d);
    restartAuto();
  }
  const next = () => { if (idx < DECKS[deck].slides.length - 1) go(idx + 1, 1); };
  const prev = () => { if (idx > 0) go(idx - 1, -1); };
  function setPlaying(p) {
    playing = p;
    $('py-play').setAttribute('aria-label', p ? 'Pause autoplay' : 'Play autoplay');
    $('py-play-icon').innerHTML = p ? '<rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/>' : '<polygon points="6 4 20 12 6 20 6 4"/>';
    restartAuto();
  }
  function restartAuto() {
    cancelAnimationFrame(autoRaf);
    $('py-autobar').style.width = '0';
    if (!playing) return;
    if (idx === DECKS[deck].slides.length - 1) { playing = false; setPlaying(false); return; }
    autoStart = performance.now();
    const tick = now => {
      const f = Math.min(1, (now - autoStart) / speed);
      $('py-autobar').style.width = (f * 100) + '%';
      if (f >= 1) next(); else autoRaf = requestAnimationFrame(tick);
    };
    autoRaf = requestAnimationFrame(tick);
  }

  function initModule() {
    renderModulePage();
    const m = location.hash.match(/^#slide-(\d+)$/);
    if (m) idx = Math.max(0, Math.min(DECKS[deck].slides.length - 1, parseInt(m[1], 10) - 1));
    startEngine();
    renderSlide(1);
    if (m) setTimeout(() => $('player').scrollIntoView({ block: 'start' }), 50);
    ready = true;

    const jump = e => { const b = e.target.closest('[data-k]'); if (b) go(+b.dataset.k); };
    $('py-dots').addEventListener('click', jump);
    $('py-outline').addEventListener('click', jump);
    $('py-learn').addEventListener('click', e => { if (e.target.closest('[data-k]')) { jump(e); $('player').scrollIntoView({ behavior: 'smooth', block: 'start' }); } });
    $('py-continue').addEventListener('click', e => { go(+e.currentTarget.dataset.k); $('player').scrollIntoView({ behavior: 'smooth', block: 'start' }); });
    $('py-stage').addEventListener('focusin', e => { if (e.target.matches('input, select') && playing) setPlaying(false); });
    $('py-reset').addEventListener('click', () => { seen[deck] = []; save(); renderSlide(1); });

    document.addEventListener('keydown', e => {
      const t = e.target;
      if (e.ctrlKey || e.metaKey || e.altKey || t.matches('input, select, textarea') || t.isContentEditable) return;
      const r = $('player').getBoundingClientRect();
      const visible = r.top < window.innerHeight * 0.6 && r.bottom > window.innerHeight * 0.3;
      if (!visible && !document.fullscreenElement) return;
      if (e.key === 'ArrowRight') { e.preventDefault(); next(); }
      else if (e.key === 'ArrowLeft') { e.preventDefault(); prev(); }
      else if (e.key === ' ' && !t.matches('button, a')) { e.preventDefault(); setPlaying(!playing); }
      else if (e.key === 'r' || e.key === 'R') { runCode(); }
    });
  }

  function init() {
    const page = document.querySelector('[data-py-page]').dataset.pyPage;
    if (page === 'home') { renderHome(); return; }
    deck = page;
    initModule();
  }

  return {
    init, go, next, prev, DECKS, splitSql,
    togglePlay: () => setPlaying(!playing),
    setSpeed: v => { speed = +v; restartAuto(); },
    resetAll: () => { ORDER.forEach(k => { seen[k] = []; }); save(); renderHome(); },
    fullscreen: () => {
      const el = $('py-player');
      try { if (document.fullscreenElement) document.exitFullscreen(); else el.requestFullscreen(); } catch (e) { /* not supported */ }
    }
  };
})();

document.addEventListener('DOMContentLoaded', SqlCourse.init);
