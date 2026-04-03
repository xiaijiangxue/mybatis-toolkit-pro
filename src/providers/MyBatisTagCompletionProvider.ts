import * as vscode from 'vscode';

const myBatisTags: { label: string; prefix: string; body: string; description: string }[] = [
    {
        label: 'if',
        prefix: 'if',
        body: '<if test="${1:condition}">\n    ${2:<!-- content -->}\n</if>',
        description: '条件判断'
    },
    {
        label: 'where',
        prefix: 'where',
        body: '<where>\n    ${1:<!-- conditions -->}\n</where>',
        description: '智能 WHERE 子句（自动处理 AND/OR）'
    },
    {
        label: 'set',
        prefix: 'set',
        body: '<set>\n    ${1:column} = #{${2:value}},\n</set>',
        description: '智能 SET 子句（自动处理逗号）'
    },
    {
        label: 'foreach',
        prefix: 'foreach',
        body: '<foreach collection="${1:list}" item="${2:item}" index="${3:index}" open="${4:(}" separator="${5:,}" close="${6:)}">\n    #{${7:item}}\n</foreach>',
        description: '循环遍历集合'
    },
    {
        label: 'choose',
        prefix: 'choose',
        body: '<choose>\n    <when test="${1:condition1}">\n        ${2:<!-- content 1 -->}\n    </when>\n    <when test="${3:condition2}">\n        ${4:<!-- content 2 -->}\n    </when>\n    <otherwise>\n        ${5:<!-- default content -->}\n    </otherwise>\n</choose>',
        description: '多条件选择（类似 switch-case）'
    },
    {
        label: 'when',
        prefix: 'when',
        body: '<when test="${1:condition}">\n    ${2:<!-- content -->}\n</when>',
        description: 'choose 中的条件分支'
    },
    {
        label: 'otherwise',
        prefix: 'otherwise',
        body: '<otherwise>\n    ${1:<!-- default content -->}\n</otherwise>',
        description: 'choose 中的默认分支'
    },
    {
        label: 'trim',
        prefix: 'trim',
        body: '<trim prefix="${1:SET}" suffixOverrides="${2:,}">\n    ${3:<!-- content -->}\n</trim>',
        description: '自定义字符串修剪'
    },
    {
        label: 'bind',
        prefix: 'bind',
        body: '<bind name="${1:pattern}" value="\'%\' + ${2:keyword} + \'%\'" />',
        description: '绑定变量'
    },
    {
        label: 'include',
        prefix: 'include',
        body: '<include refid="${1:sqlId}" />',
        description: '引用 SQL 片段'
    },
    {
        label: 'sql',
        prefix: 'sql',
        body: '<sql id="${1:id}">\n    ${2:<!-- SQL fragment -->}\n</sql>',
        description: '可重用 SQL 片段'
    },
    {
        label: 'select',
        prefix: 'select',
        body: '<select id="${1:methodName}" resultType="${2:com.example.Entity}">\n    SELECT ${3:*}\n    FROM ${4:table}\n    WHERE ${5:condition}\n</select>',
        description: 'SELECT 语句'
    },
    {
        label: 'insert',
        prefix: 'insert',
        body: '<insert id="${1:methodName}" parameterType="${2:com.example.Entity}">\n    INSERT INTO ${3:table} (${4:columns})\n    VALUES (${5:values})\n</insert>',
        description: 'INSERT 语句'
    },
    {
        label: 'update',
        prefix: 'update',
        body: '<update id="${1:methodName}" parameterType="${2:com.example.Entity}">\n    UPDATE ${3:table}\n    SET ${4:column} = #{${5:value}}\n    WHERE ${6:condition}\n</update>',
        description: 'UPDATE 语句'
    },
    {
        label: 'delete',
        prefix: 'delete',
        body: '<delete id="${1:methodName}">\n    DELETE FROM ${2:table}\n    WHERE ${3:condition}\n</delete>',
        description: 'DELETE 语句'
    },
    {
        label: 'resultMap',
        prefix: 'resultMap',
        body: '<resultMap id="${1:BaseResultMap}" type="${2:com.example.Entity}">\n    <id column="${3:id}" property="${4:id}" />\n    <result column="${5:column}" property="${6:property}" />\n</resultMap>',
        description: '结果映射'
    },
    {
        label: 'association',
        prefix: 'association',
        body: '<association property="${1:prop}" javaType="${2:com.example.Entity}">\n    <id column="${3:id}" property="${4:id}" />\n    <result column="${5:column}" property="${6:property}" />\n</association>',
        description: '一对一关联映射'
    },
    {
        label: 'collection',
        prefix: 'collection',
        body: '<collection property="${1:list}" ofType="${2:com.example.Entity}">\n    <id column="${3:id}" property="${4:id}" />\n    <result column="${5:column}" property="${6:property}" />\n</collection>',
        description: '一对多关联映射'
    }
];

export class MyBatisTagCompletionProvider implements vscode.CompletionItemProvider {
    public provideCompletionItems(
        document: vscode.TextDocument,
        position: vscode.Position,
        token: vscode.CancellationToken,
        context: vscode.CompletionContext
    ): vscode.ProviderResult<vscode.CompletionItem[] | vscode.CompletionList> {

        const lineText = document.lineAt(position.line).text;
        const textBeforeCursor = lineText.substring(0, position.character);

        const tagMatch = textBeforeCursor.match(/<(\w*)$/);
        if (!tagMatch) {
            return undefined;
        }

        const alreadyTyped = tagMatch[1].toLowerCase();

        const items: vscode.CompletionItem[] = [];

        for (const tag of myBatisTags) {
            if (!alreadyTyped || tag.prefix.startsWith(alreadyTyped)) {
                const item = new vscode.CompletionItem(tag.label, vscode.CompletionItemKind.Snippet);
                item.detail = tag.description;
                item.documentation = new vscode.MarkdownString(`\`\`\`xml\n${tag.body}\n\`\`\``);
                item.insertText = new vscode.SnippetString(tag.body);
                item.sortText = tag.prefix.startsWith(alreadyTyped) ? '0' : '1';
                items.push(item);
            }
        }

        return items;
    }
}
