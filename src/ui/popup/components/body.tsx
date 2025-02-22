import {m} from 'malevic';
import {getContext} from 'malevic/dom';
import {withForms} from 'malevic/forms';
import {withState, useState} from 'malevic/state';
import {TabPanel, Button} from '../../controls';
import FilterSettings from './filter-settings';
import {Header, MoreToggleSettings} from './header';
import Loader from './loader';
import NewBody from '../body';
import MoreSettings from './more-settings';
import {NewsGroup, NewsButton} from './news';
import SiteListSettings from './site-list-settings';
import {getDuration} from '../../../utils/time';
import {DONATE_URL, GITHUB_URL, PRIVACY_URL, TWITTER_URL, getHelpURL} from '../../../utils/links';
import {getLocalMessage} from '../../../utils/locales';
import {compose} from '../../utils';
import type {ExtensionData, ExtensionActions, News as NewsObject} from '../../../definitions';
import {isMobile, isFirefox} from '../../../utils/platform';

declare const __THUNDERBIRD__: boolean;

interface BodyProps {
    data: ExtensionData;
    actions: ExtensionActions;
}

interface BodyState {
    activeTab: string;
    newsOpen: boolean;
    didNewsSlideIn: boolean;
    moreToggleSettingsOpen: boolean;
}

function openDevTools() {
    chrome.windows.create({
        type: 'panel',
        url: isFirefox ? '../devtools/index.html' : 'ui/devtools/index.html',
        width: 600,
        height: 600,
    });
}

function Body(props: BodyProps & {fonts: string[]}) {
    const context = getContext();
    const {state, setState} = useState<BodyState>({
        activeTab: 'Filter',
        newsOpen: false,
        didNewsSlideIn: false,
        moreToggleSettingsOpen: false,
    });

    if (!props.data.isReady) {
        return (
            <body>
                <Loader complete={false} />
            </body>
        );
    }

    if (isMobile || props.data.settings.previewNewDesign) {
        return <NewBody {...props} fonts={props.fonts}/>;
    }

    const unreadNews = props.data.news.filter(({read}) => !read);
    const latestNews = props.data.news.length > 0 ? props.data.news[0] : null;
    const isFirstNewsUnread = latestNews && !latestNews.read;

    context.onRender(() => {
        if (props.data.settings.fetchNews && isFirstNewsUnread && !state.newsOpen && !state.didNewsSlideIn) {
            setTimeout(toggleNews, 750);
        }
    });

    function toggleNews() {
        if (state.newsOpen && unreadNews.length > 0) {
            props.actions.markNewsAsRead(unreadNews.map(({id}) => id));
        }
        setState({newsOpen: !state.newsOpen, didNewsSlideIn: state.didNewsSlideIn || !state.newsOpen});
    }

    function onNewsOpen(...news: NewsObject[]) {
        const unread = news.filter(({read}) => !read);
        if (unread.length > 0) {
            props.actions.markNewsAsRead(unread.map(({id}) => id));
        }
    }

    let displayedNewsCount = unreadNews.length;
    if (unreadNews.length > 0) {
        const latest = new Date(unreadNews[0].date);
        const today = new Date();
        const newsWereLongTimeAgo = latest.getTime() < today.getTime() - getDuration({days: 14});
        if (newsWereLongTimeAgo) {
            displayedNewsCount = 0;
        }
    }

    function toggleMoreToggleSettings() {
        setState({moreToggleSettingsOpen: !state.moreToggleSettingsOpen});
    }

    return (
        <body class={{'ext-disabled': !props.data.isEnabled}}>
            <Loader complete />

            <Header
                data={props.data}
                actions={props.actions}
                onMoreToggleSettingsClick={toggleMoreToggleSettings}
            />

            <TabPanel
                activeTab={state.activeTab}
                onSwitchTab={(tab) => setState({activeTab: tab})}
                tabs={__THUNDERBIRD__ ? {
                    'Filter': (
                        <FilterSettings data={props.data} actions={props.actions} />
                    ),
                    'More': (
                        <MoreSettings data={props.data} actions={props.actions} fonts={props.fonts}/>
                    ),
                } : {
                    'Filter': (
                        <FilterSettings data={props.data} actions={props.actions} />
                    ),
                    'Site list': (
                        <SiteListSettings data={props.data} actions={props.actions} isFocused={state.activeTab === 'Site list'} />
                    ),
                    'More': (
                        <MoreSettings data={props.data} actions={props.actions} fonts={props.fonts}/>
                    ),
                }}
                tabLabels={{
                    'Filter': getLocalMessage('filter'),
                    'Site list': getLocalMessage('site_list'),
                    'More': getLocalMessage('more'),
                }}
            />

            <footer>
                <div class="footer-links">
                    <a class="footer-links__link" href={PRIVACY_URL} target="_blank" rel="noopener noreferrer">{getLocalMessage('privacy')}</a>
                    <a class="footer-links__link" href={TWITTER_URL} target="_blank" rel="noopener noreferrer">Twitter</a>
                    <a class="footer-links__link" href={GITHUB_URL} target="_blank" rel="noopener noreferrer">GitHub</a>
                    <a class="footer-links__link" href={getHelpURL()} target="_blank" rel="noopener noreferrer">{getLocalMessage('help')}</a>
                </div>
                <div class="footer-buttons">
                    <a class="donate-link" href={DONATE_URL} target="_blank" rel="noopener noreferrer">
                        <span class="donate-link__text">{getLocalMessage('donate')}</span>
                    </a>
                    <NewsButton active={state.newsOpen} count={displayedNewsCount} onClick={toggleNews} />
                    <Button onclick={openDevTools} class="dev-tools-button">
                        🛠 {getLocalMessage('open_dev_tools')}
                    </Button>
                </div>
            </footer>
            <NewsGroup
                news={props.data.news}
                expanded={state.newsOpen}
                onNewsOpen={onNewsOpen}
                onClose={toggleNews}
            />
            <MoreToggleSettings
                data={props.data}
                actions={props.actions}
                isExpanded={state.moreToggleSettingsOpen}
                onClose={toggleMoreToggleSettings}
            />
        </body>
    );
}

export default compose(Body, withState, withForms);
