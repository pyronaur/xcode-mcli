# Giving external agentic coding tools access to Xcode | Apple Developer Documentation

## [Overview](/documentation/xcode/giving-agentic-coding-tools-access-to-xcode#Overview)

You can give permission for another agentic coding tool to modify your Xcode project and perform actions, such as building your app.

First, let Xcode know in settings that you plan to use an external third-party agentic coding tool for development. Then configure the agentic coding tool to access Xcode capabilities through the Model Context Protocol (MCP) server that Xcode provides. Open your project in Xcode and begin entering prompts in the agentic coding tool that utilizes Xcode. Xcode alerts you when the external agent connects to Xcode and when it’s active.

### [Update Intelligence settings to give external agents access to Xcode](/documentation/xcode/giving-agentic-coding-tools-access-to-xcode#Update-Intelligence-settings-to-give-external-agents-access-to-Xcode)

In Intelligence settings, allow external agentic coding tools to connect with Xcode using its MCP server:

1.  Choose Xcode > Settings and select Intelligence in the sidebar.
    
2.  Under Model Context Protocol, toggle Xcode Tools on.
    

### [Configure external coding tools to use the MCP server](/documentation/xcode/giving-agentic-coding-tools-access-to-xcode#Configure-external-coding-tools-to-use-the-MCP-server)

In Terminal, use the `xcrun mcpbridge` command to configure the agentic coding tool to use Xcode Tools. For example, run the following command in Terminal to give Claude Code access to your open project and Xcode capabilities:

```
claude mcp add --transport stdio xcode -- xcrun mcpbridge
```

For Codex, run:

```
codex mcp add xcode -- xcrun mcpbridge
```

To verify the configuration, enter `claude mcp list` or `codex mcp list` in Terminal.

Optionally, add hints about Xcode and your project to configuration files, such as the `AGENTS.md` or `CLAUDE.md` files, in the location that the agentic coding tool uses.

For more information on configuring agentic coding tools that run inside Xcode, see [Customize the Codex and Claude Agent environments](/documentation/xcode/setting-up-coding-intelligence#Customize-the-Codex-and-Claude-Agent-environments).
Browser 'kpwtmp-rift-glow-axon' closed
