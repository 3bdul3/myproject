# MyProject ERP - Integrations Guide

## MCP Integrations Configuration

This project is configured with the following MCP integrations to enhance development and operations:

### 🎯 Integration Use Cases for ERP System

#### 1. GitHub (`github`)
- **Purpose**: Code repository management, issue tracking, and collaboration
- **Use Cases**:
  - Create issues for bugs, features, and improvements
  - Manage pull requests and code reviews
  - Track project milestones and releases
  - Sync development tasks with ERP project management
- **Setup**: Requires `GITHUB_TOKEN` environment variable

#### 2. Notion (`notion`)
- **Purpose**: Documentation, specifications, and knowledge management
- **Use Cases**:
  - Document ERP modules and APIs
  - Maintain user stories and requirements
  - Track technical specifications and architecture decisions
  - Create process documentation for accounting, HR, inventory workflows
- **Authentication**: OAuth required (run `devin mcp login notion`)

#### 3. Linear (`linear`)
- **Purpose**: Product development and bug tracking
- **Use Cases**:
  - Track development tasks and sprints
  - Manage product roadmap for ERP features
  - Coordinate between development and business teams
  - Integrate with ERP feature requests
- **Authentication**: OAuth required (run `devin mcp login linear`)

#### 4. Canva (`canva`)
- **Purpose**: Design and branding materials
- **Use Cases**:
  - Create marketing materials for ERP system
  - Design user interface mockups and prototypes
  - Generate invoice templates and document layouts
  - Create training materials and documentation graphics
- **Authentication**: OAuth required (run `devin mcp login canva`)

#### 5. Atlassian/Jira (`atlassian`)
- **Purpose**: Enterprise issue tracking and project management
- **Use Cases**:
  - Track ERP implementation tickets
  - Manage support requests and bug reports
  - Coordinate multi-company deployment issues
  - Integrate with client support workflows
- **Authentication**: OAuth required (run `devin mcp login atlassian`)

## Authentication Setup

### Initial Setup
1. All services require OAuth authentication except GitHub (needs API token)
2. Run authentication commands from project root:
   ```bash
   devin mcp login notion
   devin mcp login linear
   devin mcp login canva
   devin mcp login atlassian
   ```

### GitHub Token Setup
Set GitHub token as environment variable:
```powershell
[Environment]::SetEnvironmentVariable("GITHUB_TOKEN", "ghp_your_token_here", "User")
```

## ERP-Specific Workflows

### Development Workflow
1. **GitHub**: Create issues for ERP features
2. **Linear**: Track development sprints
3. **Notion**: Document new modules and APIs
4. **Jira**: Track production issues and support requests

### Documentation Workflow
1. **Notion**: Write technical documentation
2. **Canva**: Create diagrams and mockups
3. **GitHub**: Store code snippets and examples
4. **Linear**: Link documentation to development tasks

### Design Workflow
1. **Canva**: Create UI mockups and branding
2. **Notion**: Document design decisions
3. **GitHub**: Track design implementation
4. **Linear**: Coordinate design-development handoff

## Project-Specific Notes

- This is a Next.js 16 project with breaking changes from standard Next.js
- Uses NeDB for file-based database storage
- Multi-company ERP with complex business logic
- Requires careful testing for accounting and financial features
- Security-critical system with authentication and audit logging

## Integration Priority

1. **High Priority**: GitHub (essential for development)
2. **Medium Priority**: Notion, Linear (documentation and task management)
3. **Optional**: Canva, Atlassian (design and enterprise project management)
