# Project Documentation

## Project Name

AppleScript MCP Server

## Description

An MCP (Model Context Protocol) server that enables LLM access to macOS AppleScript automation. It provides tools for discovering scriptable applications, retrieving AppleScript dictionaries, executing scripts with safety analysis, and learning from execution history to improve suggestions over time.

## Table of Contents

- [Architecture Overview](architecture.md) - System architecture, data flow, and component relationships
- [Type System Reference](types.md) - TypeScript interfaces, type guards, and response formats
- [Apple Integration Guide](apple-integration.md) - Executor module, SDEF parser, and osascript/sdef usage
- [Tools Reference](tools.md) - All MCP tools with parameters, return types, and usage patterns
- [Safety System](safety.md) - Dangerous pattern detection, risk levels, and confirmation flow
- [Learning System](learning.md) - Pattern storage, skill files, and failure analysis
- [Development Guide](development.md) - Build commands, testing, and adding new tools
