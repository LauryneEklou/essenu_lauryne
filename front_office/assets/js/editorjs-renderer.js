/**
 * EditorJS Renderer - Client-side enhancement for EditorJS content
 * 
 * This script enhances HTML content that was converted from EditorJS JSON on the server.
 * It applies additional styling, interactions, and formatting to make the content
 * more readable and interactive.
 * 
 * ISSUE FIX: This script now properly targets the .editorjs-output class
 * which is used by the +article-featured mixin to mark EditorJS content.
 * 
 * Previous problem: The script was looking for #editorjs or other selectors
 * that didn't match the output of +article-featured.
 */

(function() {
    'use strict';

    /**
     * Initialize EditorJS renderer on all .editorjs-output elements
     */
    function initializeEditorJSRenderer() {
        // CRITICAL FIX: Select all elements with class 'editorjs-output'
        // This matches the class used in the +article-featured mixin
        const editorjsContainers = document.querySelectorAll('.editorjs-output');
        
        if (editorjsContainers.length === 0) {
            console.log('[editorjs-renderer] No .editorjs-output containers found');
            return;
        }

        console.log(`[editorjs-renderer] Found ${editorjsContainers.length} EditorJS container(s)`);

        editorjsContainers.forEach((container, index) => {
            enhanceEditorJSContent(container, index);
        });
    }

    /**
     * Enhance a single EditorJS container with styling and interactions
     * @param {HTMLElement} container - The container element with class .editorjs-output
     * @param {number} index - Index of this container (for debugging)
     */
    function enhanceEditorJSContent(container, index) {
        console.log(`[editorjs-renderer] Enhancing container #${index}`);

        // Add responsive images
        enhanceImages(container);

        // Add styling to lists
        enhanceLists(container);

        // Add styling to blockquotes
        enhanceBlockquotes(container);

        // Add syntax highlighting to code blocks if present
        enhanceCodeBlocks(container);

        // Add table responsiveness if tables exist
        enhanceTables(container);

        // Mark container as enhanced
        container.classList.add('editorjs-enhanced');
        container.setAttribute('data-enhanced', 'true');
    }

    /**
     * Make images responsive and add lightbox capability
     */
    function enhanceImages(container) {
        const images = container.querySelectorAll('img');
        images.forEach(img => {
            // Ensure images are responsive
            if (!img.style.maxWidth) {
                img.style.maxWidth = '100%';
            }
            img.style.height = 'auto';
            
            // Add class for CSS targeting
            img.classList.add('editorjs-image');

            // Optional: Add click-to-zoom functionality
            img.style.cursor = 'pointer';
            img.addEventListener('click', function() {
                // Simple zoom toggle
                if (this.classList.contains('zoomed')) {
                    this.classList.remove('zoomed');
                    this.style.maxWidth = '100%';
                    this.style.position = 'relative';
                } else {
                    this.classList.add('zoomed');
                    this.style.maxWidth = '150%';
                    this.style.position = 'relative';
                    this.style.zIndex = '1000';
                }
            });
        });
    }

    /**
     * Enhance list styling
     */
    function enhanceLists(container) {
        const lists = container.querySelectorAll('ul, ol');
        lists.forEach(list => {
            list.classList.add('editorjs-list');
            
            // Add spacing and styling
            list.style.marginLeft = '1.5em';
            list.style.marginBottom = '1em';
        });
    }

    /**
     * Enhance blockquote styling
     */
    function enhanceBlockquotes(container) {
        const blockquotes = container.querySelectorAll('blockquote');
        blockquotes.forEach(quote => {
            quote.classList.add('editorjs-quote');
            
            // Add visual styling
            quote.style.borderLeft = '4px solid #ccc';
            quote.style.paddingLeft = '1em';
            quote.style.marginLeft = '0';
            quote.style.fontStyle = 'italic';
            quote.style.color = '#666';
        });
    }

    /**
     * Enhance code blocks with syntax highlighting classes
     */
    function enhanceCodeBlocks(container) {
        const codeBlocks = container.querySelectorAll('pre');
        codeBlocks.forEach(pre => {
            pre.classList.add('editorjs-code');
            
            // Add basic styling
            pre.style.backgroundColor = '#f5f5f5';
            pre.style.padding = '1em';
            pre.style.borderRadius = '4px';
            pre.style.overflow = 'auto';
            pre.style.fontSize = '0.9em';
        });
    }

    /**
     * Make tables responsive
     */
    function enhanceTables(container) {
        const tables = container.querySelectorAll('table');
        tables.forEach(table => {
            // Wrap table in responsive container
            if (!table.parentElement.classList.contains('table-responsive')) {
                const wrapper = document.createElement('div');
                wrapper.classList.add('table-responsive');
                wrapper.style.overflowX = 'auto';
                table.parentNode.insertBefore(wrapper, table);
                wrapper.appendChild(table);
            }
            
            table.classList.add('editorjs-table');
        });
    }

    /**
     * Initialize when DOM is ready
     */
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initializeEditorJSRenderer);
    } else {
        // DOM already loaded
        initializeEditorJSRenderer();
    }

    // Expose re-initialization function for dynamic content
    window.reinitEditorJSRenderer = initializeEditorJSRenderer;

})();
