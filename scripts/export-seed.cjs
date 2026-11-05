// Converts the existing fictional fixtures to backend seed data; no patient imports.
const fs = require('node:fs');
const path = require('node:path');
const { stripTypeScriptTypes } = require('node:module');
function fixture(name) {
  const source = fs.readFileSync(path.join(__dirname, '../src/data', name + '.ts'), 'utf8').replace(/^import .*?;\r?\n/gm, '');
  const names = [...source.matchAll(/export const (\w+)/g)].map(m => m[1]);
  const compiled = stripTypeScriptTypes(source.replace(/export const /g, 'const '));
  return new Function(compiled + '\nreturn {' + names.join(',') + '};')();
}
const users = fixture('mockUsersAndAudit');
const seed = { patients: fixture('mockPatients').MOCK_PATIENTS, documents: fixture('mockDocuments').MOCK_DOCUMENTS, users: users.STAFF_USERS, auditLogs: users.INITIAL_AUDIT_LOGS };
const destination = path.join(__dirname, '../backend/seed/mock.json');
fs.mkdirSync(path.dirname(destination), { recursive: true });
fs.writeFileSync(destination, JSON.stringify(seed, null, 2));
console.log(`Exported ${seed.patients.length} fictional patients and ${seed.documents.length} fictional documents.`);
