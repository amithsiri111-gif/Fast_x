import js from '@eslint/js';
import reactHooks from 'eslint-plugin-react-hooks';
export default [
  { ignores:['dist/**','node_modules/**','public/**'] },
  js.configs.recommended,
  { files:['src/**/*.{js,jsx}'], languageOptions:{ecmaVersion:2022,sourceType:'module',parserOptions:{ecmaFeatures:{jsx:true}},globals:{window:'readonly',document:'readonly',fetch:'readonly',navigator:'readonly',setTimeout:'readonly'}},plugins:{'react-hooks':reactHooks},rules:{...reactHooks.configs.recommended.rules,'no-unused-vars':'off'} },
  { files:['server.js','test/**/*.js'], languageOptions:{ecmaVersion:2022,sourceType:'commonjs',globals:{console:'readonly',process:'readonly',Buffer:'readonly',__dirname:'readonly',describe:'readonly',it:'readonly',expect:'readonly',beforeEach:'readonly'}} }
];
