import { readFile, writeFile, mkdir } from 'fs/promises';
import { join } from 'path';

async function ensureDirectoryExists(dir) {
  try {
    await mkdir(dir, { recursive: true });
  } catch (error) {
    if (error.code !== 'EEXIST') throw error;
  }
}

async function splitTreeIntoFiles(inputFile, outputDir = 'split-trees') {
  try {
    // Read and parse the main tree file
    const treeContent = await readFile(inputFile, 'utf-8');
    const tree = JSON.parse(treeContent);

    // Ensure output directory exists
    await ensureDirectoryExists(outputDir);

    // Create main index file containing directory references
    const index = {
      name: tree.name,
      type: 'root',
      directories: []
    };

    // Process each top-level directory
    await Promise.all(tree.children.map(async (child) => {
      if (child.type === 'directory') {
        // Add to index
        index.directories.push({
          name: child.name,
          path: `${child.name}.json`
        });

        // Save directory tree to separate file
        const filePath = join(outputDir, `${child.name}.json`);
        await writeFile(filePath, JSON.stringify(child, null, 2));
        console.log(`Created: ${filePath}`);
      } else {
        // If there are any top-level files, keep them in the index
        if (!index.files) index.files = [];
        index.files.push(child);
      }
    }));

    // Save index file
    const indexPath = join(outputDir, 'index.json');
    await writeFile(indexPath, JSON.stringify(index, null, 2));
    console.log(`Created index: ${indexPath}`);

    return {
      indexPath,
      totalDirectories: index.directories.length,
      hasTopLevelFiles: Boolean(index.files?.length)
    };
  } catch (error) {
    console.error('Error splitting tree:', error);
    throw error;
  }
}

async function main() {
  try {
    const inputFile = process.argv[2] || 'markdown-tree.json';
    const outputDir = process.argv[3] || 'split-trees';

    console.log(`Splitting tree from: ${inputFile}`);
    const result = await splitTreeIntoFiles(inputFile, outputDir);

    console.log('\nSummary:');
    console.log(`- Created ${result.totalDirectories} directory files`);
    console.log(`- Index file: ${result.indexPath}`);
    if (result.hasTopLevelFiles) {
      console.log('- Top-level files were preserved in index.json');
    }
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

main();