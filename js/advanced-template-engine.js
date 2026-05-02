
class AdvancedTemplateEngine {
    constructor() {
        this.helpers = {};
        this.partials = {};
        this.delimiters = {
            start: '{{',
            end: '}}'
        };
        this.registerDefaultHelpers();
    }

    /**
     * Register default helper functions
     */
    registerDefaultHelpers() {
        // Formatting helpers
        this.registerHelper('formatNumber', (value, options) => {
            if (typeof value === 'number') {
                if (value >= 1000000) {
                    return (value / 1000000).toFixed(1) + 'M';
                } else if (value >= 1000) {
                    return (value / 1000).toFixed(1) + 'K';
                }
                return value.toLocaleString();
            }
            return value;
        });

        this.registerHelper('formatCurrency', (value, options) => {
            if (typeof value === 'number') {
                return new Intl.NumberFormat('en-US', {
                    style: 'currency',
                    currency: 'USD'
                }).format(value);
            }
            return value;
        });

        this.registerHelper('formatDate', (value, options) => {
            if (value instanceof Date) {
                return value.toLocaleDateString();
            }
            if (typeof value === 'string') {
                return new Date(value).toLocaleDateString();
            }
            return value;
        });

        this.registerHelper('capitalize', (value) => {
            if (typeof value === 'string') {
                return value.charAt(0).toUpperCase() + value.slice(1);
            }
            return value;
        });

        this.registerHelper('pluralize', (count, singular, plural) => {
            return count === 1 ? singular : plural;
        });

        this.registerHelper('truncate', (value, length = 100) => {
            if (typeof value === 'string' && value.length > length) {
                return value.substring(0, length) + '...';
            }
            return value;
        });

        this.registerHelper('escapeHtml', (value) => {
            if (typeof value === 'string') {
                return value
                    .replace(/&/g, '&amp;')
                    .replace(/</g, '&lt;')
                    .replace(/>/g, '&gt;')
                    .replace(/"/g, '&quot;')
                    .replace(/'/g, '&#x27;');
            }
            return value;
        });

        // Conditional helpers
        this.registerHelper('if', (conditional, options) => {
            if (conditional) {
                return options.fn(this);
            } else if (options.inverse) {
                return options.inverse(this);
            }
            return '';
        });

        this.registerHelper('unless', (conditional, options) => {
            if (!conditional) {
                return options.fn(this);
            }
            return '';
        });

        this.registerHelper('eq', (a, b, options) => {
            if (a === b) {
                return options.fn(this);
            } else if (options.inverse) {
                return options.inverse(this);
            }
            return '';
        });

        this.registerHelper('gt', (a, b, options) => {
            if (a > b) {
                return options.fn(this);
            } else if (options.inverse) {
                return options.inverse(this);
            }
            return '';
        });

        this.registerHelper('lt', (a, b, options) => {
            if (a < b) {
                return options.fn(this);
            } else if (options.inverse) {
                return options.inverse(this);
            }
            return '';
        });

        // Loop helpers
        this.registerHelper('each', (array, options) => {
            if (!Array.isArray(array)) {
                return '';
            }
            
            let result = '';
            for (let i = 0; i < array.length; i++) {
                const item = array[i];
                const context = {
                    ...this,
                    ...item,
                    index: i,
                    first: i === 0,
                    last: i === array.length - 1,
                    even: i % 2 === 0,
                    odd: i % 2 === 1
                };
                result += options.fn(context);
            }
            return result;
        });

        this.registerHelper('with', (context, options) => {
            if (context) {
                return options.fn(context);
            }
            return '';
        });

        // Utility helpers
        this.registerHelper('join', (array, separator = ', ') => {
            if (Array.isArray(array)) {
                return array.join(separator);
            }
            return array;
        });

        this.registerHelper('length', (array) => {
            if (Array.isArray(array)) {
                return array.length;
            }
            return 0;
        });

        this.registerHelper('math', (operation, a, b) => {
            switch (operation) {
                case 'add': return a + b;
                case 'subtract': return a - b;
                case 'multiply': return a * b;
                case 'divide': return a / b;
                case 'modulo': return a % b;
                default: return a;
            }
        });

        this.registerHelper('default', (value, defaultValue) => {
            return value !== undefined && value !== null && value !== '' ? value : defaultValue;
        });
    }

    /**
     * Register a custom helper function
     */
    registerHelper(name, fn) {
        this.helpers[name] = fn;
    }

    /**
     * Register a partial template
     */
    registerPartial(name, template) {
        this.partials[name] = template;
    }

    /**
     * Set custom delimiters
     */
    setDelimiters(start, end) {
        this.delimiters.start = start;
        this.delimiters.end = end;
    }

    /**
     * Compile and render a template with data
     */
    render(template, data = {}) {
        try {
            const compiled = this.compile(template);
            return compiled(data);
        } catch (error) {
            console.error('Template rendering error:', error);
            return `<div class="template-error">Template rendering error: ${error.message}</div>`;
        }
    }

    /**
     * Compile a template string into a render function
     */
    compile(template) {
        // Parse the template into tokens
        const tokens = this.parseTemplate(template);
        
        return (data) => {
            return this.renderTokens(tokens, data);
        };
    }

    /**
     * Parse template into tokens
     */
    parseTemplate(template) {
        const tokens = [];
        const startDelim = this.escapeRegex(this.delimiters.start);
        const endDelim = this.escapeRegex(this.delimiters.end);
        
        // Split template into static and dynamic parts
        const parts = template.split(new RegExp(`(${startDelim}.*?${endDelim})`, 'g'));
        
        for (let i = 0; i < parts.length; i++) {
            const part = parts[i];
            
            if (i % 2 === 0) {
                // Static part
                if (part) {
                    tokens.push({ type: 'text', content: part });
                }
            } else {
                // Dynamic part
                const content = part.slice(
                    this.delimiters.start.length,
                    -this.delimiters.end.length
                ).trim();
                
                if (content.startsWith('#') || content.startsWith('/')) {
                    // Block helper
                    const blockToken = this.parseBlockHelper(content);
                    if (blockToken) {
                        tokens.push(blockToken);
                    }
                } else if (content.startsWith('>')) {
                    // Partial
                    tokens.push({
                        type: 'partial',
                        name: content.slice(1).trim()
                    });
                } else if (content.startsWith('^')) {
                    // Inverse block
                    tokens.push({
                        type: 'inverse',
                        helper: content.slice(1).trim()
                    });
                } else {
                    // Simple variable or helper
                    tokens.push({
                        type: 'variable',
                        content: content
                    });
                }
            }
        }
        
        return tokens;
    }

    /**
     * Parse block helper
     */
    parseBlockHelper(content) {
        if (content.startsWith('#')) {
            const parts = content.slice(1).split(' ');
            const helperName = parts[0];
            const args = parts.slice(1);
            
            return {
                type: 'block',
                helper: helperName,
                args: args,
                content: content
            };
        } else if (content.startsWith('/')) {
            return {
                type: 'endblock',
                helper: content.slice(1).trim()
            };
        }
        return null;
    }

    /**
     * Render tokens with data
     */
    renderTokens(tokens, data) {
        let result = '';
        let i = 0;
        
        while (i < tokens.length) {
            const token = tokens[i];
            
            switch (token.type) {
                case 'text':
                    result += token.content;
                    break;
                    
                case 'variable':
                    result += this.evaluateVariable(token.content, data);
                    break;
                    
                case 'partial':
                    result += this.renderPartial(token.name, data);
                    break;
                    
                case 'block':
                    const blockResult = this.renderBlock(token, tokens, data, i);
                    result += blockResult.html;
                    i = blockResult.nextIndex;
                    break;
                    
                case 'endblock':
                    // Skip endblock tokens
                    break;
                    
                case 'inverse':
                    // Handle inverse blocks
                    break;
            }
            
            i++;
        }
        
        return result;
    }

    /**
     * Render a block helper
     */
    renderBlock(token, tokens, data, startIndex) {
        const helper = this.helpers[token.helper];
        if (!helper) {
            return { html: '', nextIndex: startIndex + 1 };
        }
        
        // Find the end of this block
        let endIndex = startIndex + 1;
        let depth = 1;
        
        while (endIndex < tokens.length && depth > 0) {
            const currentToken = tokens[endIndex];
            if (currentToken.type === 'block' && currentToken.helper === token.helper) {
                depth++;
            } else if (currentToken.type === 'endblock' && currentToken.helper === token.helper) {
                depth--;
            }
            endIndex++;
        }
        
        // Extract block content
        const blockTokens = tokens.slice(startIndex + 1, endIndex - 1);
        const blockContent = this.renderTokens(blockTokens, data);
        
        // Create options object for helper
        const options = {
            fn: (context) => this.renderTokens(blockTokens, { ...data, ...context }),
            inverse: () => '',
            data: data
        };
        
        // Call helper with arguments and options
        const args = token.args.map(arg => this.resolveValue(arg, data));
        const html = helper(...args, options);
        
        return { html, nextIndex: endIndex };
    }

    /**
     * Evaluate a variable expression
     */
    evaluateVariable(expression, context) {
        // Handle helper calls
        if (expression.includes(' ')) {
            const parts = expression.split(' ');
            const helperName = parts[0];
            const args = parts.slice(1);
            
            if (this.helpers[helperName]) {
                const helperArgs = args.map(arg => this.resolveValue(arg, context));
                return this.helpers[helperName](...helperArgs);
            }
        }

        // Simple variable resolution
        return this.resolveValue(expression, context);
    }

    /**
     * Render a partial template
     */
    renderPartial(name, data) {
        if (this.partials[name]) {
            return this.render(this.partials[name], data);
        }
        return '';
    }

    /**
     * Resolve a value from context using dot notation
     */
    resolveValue(path, context) {
        if (!path) return '';
        
        const keys = path.split('.');
        let value = context;
        
        for (const key of keys) {
            if (value && typeof value === 'object' && key in value) {
                value = value[key];
            } else {
                return '';
            }
        }
        
        return value !== undefined && value !== null ? value : '';
    }

    /**
     * Escape regex special characters
     */
    escapeRegex(string) {
        return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }

    /**
     * Render a template and insert into DOM
     */
    renderInto(element, template, data) {
        if (typeof element === 'string') {
            element = document.getElementById(element);
        }
        
        if (element) {
            element.innerHTML = this.render(template, data);
        }
    }

    /**
     * Create a template builder for complex templates
     */
    template(strings, ...values) {
        return (data) => {
            let result = '';
            for (let i = 0; i < strings.length; i++) {
                result += strings[i];
                if (i < values.length) {
                    const value = values[i];
                    if (typeof value === 'function') {
                        result += value(data);
                    } else {
                        result += value;
                    }
                }
            }
            return result;
        };
    }
}

// Create a global instance
const advancedTemplateEngine = new AdvancedTemplateEngine();

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = AdvancedTemplateEngine;
}

// Make available globally
window.AdvancedTemplateEngine = AdvancedTemplateEngine;
window.advancedTemplateEngine = advancedTemplateEngine;
window.templateEngine = advancedTemplateEngine;
