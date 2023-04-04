import * as vscode from "vscode";
import { ChatGPTAPI } from "chatgpt";
import fetch from "node-fetch";

type AuthInfo = { apiKey?: string };
type Settings = {
  selectedInsideCodeblock?: boolean;
  codeblockWithLanguageId?: false;
  pasteOnClick?: boolean;
  keepConversation?: boolean;
  timeoutLength?: number;
};

function openSettings() {
  vscode.commands.executeCommand(
    "workbench.action.openSettings",
    "@ext:raulgonzalezdev.chatgpt"
  );
}


interface OpenAIResponse {
	choices: Array<{
	  text: string;
	}>;
  }
  
   async function chatGptRequest(
	prompt: string
  ): Promise<{ label: string; code: string; comment: string }[]> {
	const config = vscode.workspace.getConfiguration("chatgpt");
	const apiKey = config.get("apiKey");
  
	const response = await fetch(
	  "https://api.openai.com/v1/engines/davinci-codex/completions",
	  {
		method: "POST",
		headers: {
		  "Content-Type": "application/json",
		  Authorization: `Bearer ${apiKey}`,
		},
		body: JSON.stringify({
		  prompt: prompt,
		  max_tokens: 100,
		  n: 3,
		  stop: ["\n"],
		  temperature: 0.5,
		}),
	  }
	);
  
	if (!response.ok) {
	  throw new Error("Failed to fetch data from ChatGPT");
	}
  
	const data = (await response.json()) as OpenAIResponse;
	const suggestions = data.choices.map((choice) => ({
	  label: choice.text.trim(),
	  code: choice.text.trim(),
	  comment: "", // Aquí puedes agregar comentarios si es necesario
	}));
  
	return suggestions;
  }

export function activate(context: vscode.ExtensionContext) {
  console.log('activating extension "chatgpt"');
  // Get the settings from the extension's configuration
  const config = vscode.workspace.getConfiguration("chatgpt");

  // Create a new ChatGPTViewProvider instance and register it with the extension's context
  const provider = new ChatGPTViewProvider(context.extensionUri);

  // Put configuration settings into the provider
  provider.setAuthenticationInfo({
    apiKey: config.get("apiKey"),
  });
  provider.setSettings({
    selectedInsideCodeblock: config.get("selectedInsideCodeblock") || false,
    codeblockWithLanguageId: config.get("codeblockWithLanguageId") || false,
    pasteOnClick: config.get("pasteOnClick") || false,
    keepConversation: config.get("keepConversation") || false,
    timeoutLength: config.get("timeoutLength") || 60,
  });

  const documentSelector: vscode.DocumentSelector = [
    { language: "javascript", scheme: "file" },
    { language: "typescript", scheme: "file" },
    { language: "python", scheme: "file" },
    { language: "ruby", scheme: "file" },
    { language: "php", scheme: "file" },
    { language: "java", scheme: "file" },
    { language: "c", scheme: "file" },
    { language: "cpp", scheme: "file" },
    { language: "csharp", scheme: "file" },
    { language: "go", scheme: "file" },
    { language: "rust", scheme: "file" },
    { language: "swift", scheme: "file" },
    { language: "kotlin", scheme: "file" },
    { language: "scala", scheme: "file" },
    { language: "perl", scheme: "file" },
    { language: "lua", scheme: "file" },
    { language: "haskell", scheme: "file" },
    { language: "r", scheme: "file" },
    { language: "groovy", scheme: "file" },
    { language: "powershell", scheme: "file" },
    { language: "dart", scheme: "file" },
    { language: "sql", scheme: "file" },
    { language: "shellscript", scheme: "file" },
    { language: "yaml", scheme: "file" },
    { language: "json", scheme: "file" },
    { language: "xml", scheme: "file" },
    { language: "html", scheme: "file" },
    { language: "css", scheme: "file" },
    { language: "markdown", scheme: "file" },
  ];
  const providers = new ChatGPTCompletionItemProvider();
  const providerDisposable = vscode.languages.registerCompletionItemProvider(
    documentSelector,
    providers
  );

  context.subscriptions.push(providerDisposable);

  // Register the provider with the extension's context
  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider(
      ChatGPTViewProvider.viewType,
      provider,
      {
        webviewOptions: { retainContextWhenHidden: true },
      }
    )
  );

  const commandHandler = (command: string) => {
    const config = vscode.workspace.getConfiguration("chatgpt");
    const prompt = config.get(command) as string;
    provider.search(prompt);
  };

  // Register the commands that can be called from the extension's package.json
  context.subscriptions.push(
    vscode.commands.registerCommand("chatgpt.ask", () =>
      vscode.window
        .showInputBox({ prompt: "What do you want to do?" })
        .then((value) => provider.search(value))
    ),
    vscode.commands.registerCommand("chatgpt.explain", () =>
      commandHandler("promptPrefix.explain")
    ),
    vscode.commands.registerCommand("chatgpt.refactor", () =>
      commandHandler("promptPrefix.refactor")
    ),
    vscode.commands.registerCommand("chatgpt.optimize", () =>
      commandHandler("promptPrefix.optimize")
    ),
    vscode.commands.registerCommand("chatgpt.findProblems", () =>
      commandHandler("promptPrefix.findProblems")
    ),
    vscode.commands.registerCommand("chatgpt.documentation", () =>
      commandHandler("promptPrefix.documentation")
    ),
    vscode.commands.registerCommand("chatgpt.resetConversation", () =>
      provider.resetConversation()
    ),
    vscode.commands.registerCommand("chatgpt.openSettings", openSettings)
  );

  const settingsButton = vscode.window.createStatusBarItem(
    vscode.StatusBarAlignment.Right,
    100
  );
  settingsButton.command = "chatgpt.openSettings";
  settingsButton.text = "ChatGPT";
  settingsButton.tooltip = "Abrir configuración de la extensión ChatGPT";
  settingsButton.show();
  context.subscriptions.push(settingsButton);

  // Change the extension's session token or settings when configuration is changed
  vscode.workspace.onDidChangeConfiguration(
    (event: vscode.ConfigurationChangeEvent) => {
      if (event.affectsConfiguration("chatgpt.apiKey")) {
        const config = vscode.workspace.getConfiguration("chatgpt");
        provider.setAuthenticationInfo({ apiKey: config.get("apiKey") });
      } else if (
        event.affectsConfiguration("chatgpt.selectedInsideCodeblock")
      ) {
        const config = vscode.workspace.getConfiguration("chatgpt");
        provider.setSettings({
          selectedInsideCodeblock:
            config.get("selectedInsideCodeblock") || false,
        });
      } else if (
        event.affectsConfiguration("chatgpt.codeblockWithLanguageId")
      ) {
        const config = vscode.workspace.getConfiguration("chatgpt");
        provider.setSettings({
          codeblockWithLanguageId:
            config.get("codeblockWithLanguageId") || false,
        });
      } else if (event.affectsConfiguration("chatgpt.pasteOnClick")) {
        const config = vscode.workspace.getConfiguration("chatgpt");
        provider.setSettings({
          pasteOnClick: config.get("pasteOnClick") || false,
        });
      } else if (event.affectsConfiguration("chatgpt.keepConversation")) {
        const config = vscode.workspace.getConfiguration("chatgpt");
        provider.setSettings({
          keepConversation: config.get("keepConversation") || false,
        });
      } else if (event.affectsConfiguration("chatgpt.timeoutLength")) {
        const config = vscode.workspace.getConfiguration("chatgpt");
        provider.setSettings({
          timeoutLength: config.get("timeoutLength") || 60,
        });
      }
    }
  );
}

class ChatGPTCompletionItemProvider implements vscode.CompletionItemProvider {
	public async provideCompletionItems(
    document: vscode.TextDocument,
    position: vscode.Position,
    token: vscode.CancellationToken,
    context: vscode.CompletionContext
  ): Promise<vscode.CompletionItem[] | undefined> {
    const linePrefix = document
      .lineAt(position)
      .text.substr(0, position.character);
    const response = await chatGptRequest(linePrefix); // Implementa esta función para realizar solicitudes a ChatGPT

    if (!response) {
      return undefined;
    }

    const completionItems: vscode.CompletionItem[] = [];

    for (const suggestion of response) {
      const item = new vscode.CompletionItem(
        suggestion.label,
        vscode.CompletionItemKind.Snippet
      );
      item.insertText = new vscode.SnippetString(suggestion.code);
      item.documentation = new vscode.MarkdownString(suggestion.comment);
      completionItems.push(item);
    }

    return completionItems;
  }
}


class ChatGPTViewProvider implements vscode.WebviewViewProvider {
  public static readonly viewType = "chatgpt.chatView";
  private _view?: vscode.WebviewView;

  private _chatGPTAPI?: ChatGPTAPI;
  private _conversation?: any;

  private _response?: string;
  private _prompt?: string;
  private _fullPrompt?: string;
  private _currentMessageNumber = 0;

  private _settings: Settings = {
    selectedInsideCodeblock: false,
    codeblockWithLanguageId: false,
    pasteOnClick: true,
    keepConversation: true,
    timeoutLength: 60,
  };
  private _authInfo?: AuthInfo;

  // In the constructor, we store the URI of the extension
  constructor(private readonly _extensionUri: vscode.Uri) {}

  // Set the API key and create a new API instance based on this key
  public setAuthenticationInfo(authInfo: AuthInfo) {
    this._authInfo = authInfo;
    this._newAPI();
  }

  public setSettings(settings: Settings) {
    this._settings = { ...this._settings, ...settings };
  }

  public getSettings() {
    return this._settings;
  }

  // This private method initializes a new ChatGPTAPI instance
  private _newAPI() {
    console.log("New API");
    if (!this._authInfo || !this._authInfo?.apiKey) {
      console.warn(
        "API key not set, please go to extension settings (read README.md for more info)"
      );
    } else {
      this._chatGPTAPI = new ChatGPTAPI({
        apiKey: this._authInfo.apiKey,
      });
    }
  }

  public resolveWebviewView(
    webviewView: vscode.WebviewView,
    context: vscode.WebviewViewResolveContext,
    _token: vscode.CancellationToken
  ) {
    this._view = webviewView;

    // set options for the webview, allow scripts
    webviewView.webview.options = {
      enableScripts: true,
      localResourceRoots: [this._extensionUri],
    };

    // set the HTML for the webview
    webviewView.webview.html = this._getHtmlForWebview(webviewView.webview);

    // add an event listener for messages received by the webview
    webviewView.webview.onDidReceiveMessage((data) => {
      switch (data.type) {
        case "codeSelected": {
          // do nothing if the pasteOnClick option is disabled
          if (!this._settings.pasteOnClick) {
            break;
          }
          let code = data.value;
          const snippet = new vscode.SnippetString();
          snippet.appendText(code);
          // insert the code as a snippet into the active text editor
          vscode.window.activeTextEditor?.insertSnippet(snippet);
          break;
        }
        case "prompt": {
          this.search(data.value);
        }
      }
    });
  }

  public async resetConversation() {
    console.log(this, this._conversation);
    if (this._conversation) {
      this._conversation = null;
    }
    this._prompt = "";
    this._response = "";
    this._fullPrompt = "";
    this._view?.webview.postMessage({ type: "setPrompt", value: "" });
    this._view?.webview.postMessage({ type: "addResponse", value: "" });
  }

  public async search(prompt?: string) {
    this._prompt = prompt;
    if (!prompt) {
      prompt = "";
    }

    // Check if the ChatGPTAPI instance is defined
    if (!this._chatGPTAPI) {
      this._newAPI();
    }

    // focus gpt activity from activity bar
    if (!this._view) {
      await vscode.commands.executeCommand("chatgpt.chatView.focus");
    } else {
      this._view?.show?.(true);
    }

    let response = "";
    this._response = "";
    // Get the selected text of the active editor
    const selection = vscode.window.activeTextEditor?.selection;
    const selectedText =
      vscode.window.activeTextEditor?.document.getText(selection);
    // Get the language id of the selected text of the active editor
    // If a user does not want to append this information to their prompt, leave it as an empty string
    const languageId =
      (this._settings.codeblockWithLanguageId
        ? vscode.window.activeTextEditor?.document?.languageId
        : undefined) || "";
    let searchPrompt = "";

    if (selection && selectedText) {
      // If there is a selection, add the prompt and the selected text to the search prompt
      if (this._settings.selectedInsideCodeblock) {
        searchPrompt = `${prompt}\n\`\`\`${languageId}\n${selectedText}\n\`\`\``;
      } else {
        searchPrompt = `${prompt}\n${selectedText}\n`;
      }
    } else {
      // Otherwise, just use the prompt if user typed it
      searchPrompt = prompt;
    }
    this._fullPrompt = searchPrompt;

    if (!this._chatGPTAPI) {
      response =
        '[ERROR] "API key not set or wrong, please go to extension settings to set it (read README.md for more info)"';
    } else {
      // If successfully signed in
      console.log("sendMessage");

      // Make sure the prompt is shown
      this._view?.webview.postMessage({
        type: "setPrompt",
        value: this._prompt,
      });
      this._view?.webview.postMessage({ type: "addResponse", value: "..." });

      // Increment the message number
      this._currentMessageNumber++;

      const agent = this._chatGPTAPI;

      try {
        // Send the search prompt to the ChatGPTAPI instance and store the response
        let currentMessageNumber = this._currentMessageNumber;
        const res = await agent.sendMessage(searchPrompt, {
          onProgress: (partialResponse) => {
            // If the message number has changed, don't show the partial response
            if (this._currentMessageNumber !== currentMessageNumber) {
              return;
            }
            console.log("onProgress");
            if (this._view && this._view.visible) {
              response = partialResponse.text;
              this._view.webview.postMessage({
                type: "addResponse",
                value: partialResponse.text,
              });
            }
          },
          timeoutMs: (this._settings.timeoutLength || 60) * 1000,
          ...this._conversation,
        });

        if (this._currentMessageNumber !== currentMessageNumber) {
          return;
        }

        response = res.text;
        if (this._settings.keepConversation) {
          this._conversation = {
            parentMessageId: res.id,
          };
        }
      } catch (e: any) {
        console.error(e);
        response += `\n\n---\n[ERROR] ${e}`;
      }
    }

    // Saves the response
    this._response = response;

    // Show the view and send a message to the webview with the response
    if (this._view) {
      this._view.show?.(true);
      this._view.webview.postMessage({ type: "addResponse", value: response });
    }
  }

  private _getHtmlForWebview(webview: vscode.Webview) {
    const scriptUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this._extensionUri, "media", "main.js")
    );
    const microlightUri = webview.asWebviewUri(
      vscode.Uri.joinPath(
        this._extensionUri,
        "media",
        "scripts",
        "microlight.min.js"
      )
    );
    const tailwindUri = webview.asWebviewUri(
      vscode.Uri.joinPath(
        this._extensionUri,
        "media",
        "scripts",
        "showdown.min.js"
      )
    );
    const showdownUri = webview.asWebviewUri(
      vscode.Uri.joinPath(
        this._extensionUri,
        "media",
        "scripts",
        "tailwind.min.js"
      )
    );

    return `<!DOCTYPE html>
			<html lang="en">
			<head>
				<meta charset="UTF-8">
				<meta name="viewport" content="width=device-width, initial-scale=1.0">
				<script src="${tailwindUri}"></script>
				<script src="${showdownUri}"></script>
				<script src="${microlightUri}"></script>
				<style>
				.code {
					white-space: pre;
				}
				p {
					padding-top: 0.3rem;
					padding-bottom: 0.3rem;
				}
				/* overrides vscodes style reset, displays as if inside web browser */
				ul, ol {
					list-style: initial !important;
					margin-left: 10px !important;
				}
				h1, h2, h3, h4, h5, h6 {
					font-weight: bold !important;
				}
				</style>
			</head>
			<body>
				<input class="h-10 w-full text-white bg-stone-700 p-4 text-sm" placeholder="Ask ChatGPT something" id="prompt-input" />
				
				<div id="response" class="pt-4 text-sm">
				</div>

				<script src="${scriptUri}"></script>
			</body>
			</html>`;
  }
}

// This method is called when your extension is deactivated
export function deactivate() {}
