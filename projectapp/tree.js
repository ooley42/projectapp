import { readFile, writeFile } from 'fs/promises';
import { join, relative } from 'path';
import { globby } from 'globby';
import matter from 'gray-matter';

async function buildMarkdownTree(rootDir) {
  try {
    // Find all .md files recursively
    const files = await globby('**/*.md', {
      cwd: rootDir,
      absolute: true
    });

    // Process each file
    const fileTree = await Promise.all(files.map(async (filepath) => {
      const content = await readFile(filepath, 'utf-8');
      const { data: frontmatter, content: markdownContent } = matter(content);

      // Get relative path from root directory
      const relativePath = relative(rootDir, filepath);

      // Split the path into segments for tree structure
      const pathSegments = relativePath.split('/');

      return {
        path: relativePath,
        segments: pathSegments,
        frontmatter,
        content: markdownContent.trim(),
        fileName: pathSegments[pathSegments.length - 1]
      };
    }));

    // Convert flat array into tree structure
    const tree = {
      name: 'root',
      type: 'directory',
      children: []
    };

    fileTree.forEach(file => {
      let currentLevel = tree;

      // Navigate through path segments
      file.segments.forEach((segment, index) => {
        const isLastSegment = index === file.segments.length - 1;

        if (isLastSegment) {
          // Add file node
          currentLevel.children.push({
            name: segment,
            type: 'file',
            frontmatter: file.frontmatter,
            content: file.content
          });
        } else {
          // Find or create directory
          let dirNode = currentLevel.children.find(
            node => node.type === 'directory' && node.name === segment
          );

          if (!dirNode) {
            dirNode = {
              name: segment,
              type: 'directory',
              children: []
            };
            currentLevel.children.push(dirNode);
          }

          currentLevel = dirNode;
        }
      });
    });

    return tree;
  } catch (error) {
    console.error('Error building markdown tree:', error);
    throw error;
  }
}

async function main() {
  try {
    const rootDir = process.argv[2] || '.';
    const outputFile = process.argv[3] || 'markdown-tree.json';

    console.log(`Building markdown tree from: ${rootDir}`);
    const tree = await buildMarkdownTree(rootDir);

    // Save tree to JSON file
    await writeFile(outputFile, JSON.stringify(tree, null, 2));
    console.log(`Tree saved to: ${outputFile}`);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

main();