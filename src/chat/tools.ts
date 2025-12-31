/**
 * Agent Tools - File and code analysis capabilities for chat agents
 */

import * as fs from "fs";
import * as path from "path";
import type Anthropic from "@anthropic-ai/sdk";

// Project root for file operations
const PROJECT_ROOT = process.env.PROJECT_ROOT || process.cwd();

/**
 * Tool definitions for Anthropic API
 */
export const agentTools: Anthropic.Tool[] = [
  {
    name: "read_file",
    description:
      "Read the contents of a file. Use this to examine source code, configuration files, or any text file in the project.",
    input_schema: {
      type: "object" as const,
      properties: {
        file_path: {
          type: "string",
          description:
            "The relative path to the file from the project root (e.g., 'src/index.ts', 'package.json')",
        },
      },
      required: ["file_path"],
    },
  },
  {
    name: "list_files",
    description:
      "List files and directories in a given path. Use this to explore the project structure.",
    input_schema: {
      type: "object" as const,
      properties: {
        directory: {
          type: "string",
          description:
            "The relative directory path to list (e.g., 'src', 'src/components'). Use '.' for root.",
        },
        recursive: {
          type: "boolean",
          description: "If true, list files recursively (default: false)",
        },
      },
      required: ["directory"],
    },
  },
  {
    name: "search_code",
    description:
      "Search for a pattern or keyword in the codebase. Use this to find where something is defined or used.",
    input_schema: {
      type: "object" as const,
      properties: {
        query: {
          type: "string",
          description: "The search query (text or regex pattern)",
        },
        file_pattern: {
          type: "string",
          description:
            "Optional file pattern to filter (e.g., '*.ts', '*.tsx'). Default: all files",
        },
      },
      required: ["query"],
    },
  },
  {
    name: "get_project_structure",
    description:
      "Get an overview of the project structure including main directories and key files.",
    input_schema: {
      type: "object" as const,
      properties: {},
      required: [],
    },
  },
];

/**
 * Execute a tool and return the result
 */
export async function executeTool(
  toolName: string,
  toolInput: Record<string, unknown>,
): Promise<string> {
  try {
    switch (toolName) {
      case "read_file":
        return readFile(toolInput.file_path as string);
      case "list_files":
        return listFiles(
          toolInput.directory as string,
          toolInput.recursive as boolean,
        );
      case "search_code":
        return searchCode(
          toolInput.query as string,
          toolInput.file_pattern as string | undefined,
        );
      case "get_project_structure":
        return getProjectStructure();
      default:
        return `Unknown tool: ${toolName}`;
    }
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    return `Error executing ${toolName}: ${message}`;
  }
}

/**
 * Read file contents
 */
function readFile(filePath: string): string {
  const fullPath = path.resolve(PROJECT_ROOT, filePath);

  // Security: prevent directory traversal
  if (!fullPath.startsWith(PROJECT_ROOT)) {
    return "Error: Access denied - path outside project root";
  }

  if (!fs.existsSync(fullPath)) {
    return `Error: File not found: ${filePath}`;
  }

  const stats = fs.statSync(fullPath);
  if (stats.isDirectory()) {
    return `Error: ${filePath} is a directory, not a file`;
  }

  // Limit file size to prevent memory issues
  if (stats.size > 100000) {
    const content = fs.readFileSync(fullPath, "utf-8").substring(0, 100000);
    return `${content}\n\n[File truncated - showing first 100KB of ${stats.size} bytes]`;
  }

  return fs.readFileSync(fullPath, "utf-8");
}

/**
 * List files in directory
 */
function listFiles(directory: string, recursive = false): string {
  const fullPath = path.resolve(PROJECT_ROOT, directory);

  // Security: prevent directory traversal
  if (!fullPath.startsWith(PROJECT_ROOT)) {
    return "Error: Access denied - path outside project root";
  }

  if (!fs.existsSync(fullPath)) {
    return `Error: Directory not found: ${directory}`;
  }

  const results: string[] = [];

  function scan(dir: string, prefix = "") {
    const entries = fs.readdirSync(dir, { withFileTypes: true });

    // Skip node_modules and hidden directories
    const filtered = entries.filter(
      (e) => !e.name.startsWith(".") && e.name !== "node_modules",
    );

    for (const entry of filtered) {
      const relativePath = path.join(prefix, entry.name);
      if (entry.isDirectory()) {
        results.push(`📁 ${relativePath}/`);
        if (recursive) {
          scan(path.join(dir, entry.name), relativePath);
        }
      } else {
        results.push(`📄 ${relativePath}`);
      }
    }
  }

  scan(fullPath);

  if (results.length === 0) {
    return "Directory is empty or contains only hidden files/node_modules";
  }

  return (
    results.slice(0, 100).join("\n") +
    (results.length > 100 ? `\n... and ${results.length - 100} more files` : "")
  );
}

/**
 * Search for pattern in codebase
 */
function searchCode(query: string, filePattern?: string): string {
  const results: { file: string; line: number; content: string }[] = [];
  const regex = new RegExp(query, "gi");

  function searchDir(dir: string) {
    const entries = fs.readdirSync(dir, { withFileTypes: true });

    for (const entry of entries) {
      // Skip node_modules, hidden dirs, and non-code files
      if (entry.name.startsWith(".") || entry.name === "node_modules") {
        continue;
      }

      const fullPath = path.join(dir, entry.name);

      if (entry.isDirectory()) {
        searchDir(fullPath);
      } else {
        // Check file pattern
        if (filePattern) {
          const pattern = filePattern.replace("*", ".*");
          if (!new RegExp(pattern).test(entry.name)) {
            continue;
          }
        }

        // Only search text files
        const ext = path.extname(entry.name).toLowerCase();
        const textExts = [
          ".ts",
          ".tsx",
          ".js",
          ".jsx",
          ".json",
          ".md",
          ".css",
          ".html",
          ".yaml",
          ".yml",
          ".toml",
          ".env",
          ".sh",
        ];
        if (!textExts.includes(ext) && ext !== "") {
          continue;
        }

        try {
          const content = fs.readFileSync(fullPath, "utf-8");
          const lines = content.split("\n");

          for (let i = 0; i < lines.length; i++) {
            if (regex.test(lines[i])) {
              const relativePath = path.relative(PROJECT_ROOT, fullPath);
              results.push({
                file: relativePath,
                line: i + 1,
                content: lines[i].trim().substring(0, 100),
              });

              if (results.length >= 50) {
                return; // Limit results
              }
            }
          }
        } catch {
          // Skip files that can't be read
        }
      }
    }
  }

  searchDir(PROJECT_ROOT);

  if (results.length === 0) {
    return `No matches found for: ${query}`;
  }

  return results.map((r) => `${r.file}:${r.line}: ${r.content}`).join("\n");
}

/**
 * Get project structure overview
 */
function getProjectStructure(): string {
  const structure: string[] = [];

  // Read package.json for project info
  const packagePath = path.join(PROJECT_ROOT, "package.json");
  if (fs.existsSync(packagePath)) {
    const pkg = JSON.parse(fs.readFileSync(packagePath, "utf-8"));
    structure.push(`📦 Project: ${pkg.name || "unknown"}`);
    structure.push(`📝 Description: ${pkg.description || "N/A"}`);
    structure.push(
      `🔧 Main dependencies: ${Object.keys(pkg.dependencies || {})
        .slice(0, 10)
        .join(", ")}`,
    );
    structure.push("");
  }

  // List top-level directories
  structure.push("📁 Project Structure:");
  const entries = fs.readdirSync(PROJECT_ROOT, { withFileTypes: true });
  const filtered = entries.filter(
    (e) => !e.name.startsWith(".") && e.name !== "node_modules",
  );

  for (const entry of filtered) {
    if (entry.isDirectory()) {
      structure.push(`  📁 ${entry.name}/`);
      // List immediate children
      try {
        const children = fs.readdirSync(path.join(PROJECT_ROOT, entry.name));
        const childDirs = children.filter((c) => {
          const stat = fs.statSync(path.join(PROJECT_ROOT, entry.name, c));
          return stat.isDirectory() && !c.startsWith(".");
        });
        if (childDirs.length > 0) {
          structure.push(
            `      └── ${childDirs.slice(0, 5).join(", ")}${childDirs.length > 5 ? "..." : ""}`,
          );
        }
      } catch {
        // Skip if can't read
      }
    } else {
      structure.push(`  📄 ${entry.name}`);
    }
  }

  // Key files
  structure.push("");
  structure.push("🔑 Key Files:");
  const keyFiles = [
    "src/index.ts",
    "src/api/chat.ts",
    "src/chat/manager.ts",
    "CLAUDE.md",
    "README.md",
  ];

  for (const file of keyFiles) {
    if (fs.existsSync(path.join(PROJECT_ROOT, file))) {
      structure.push(`  ✓ ${file}`);
    }
  }

  return structure.join("\n");
}
