// TODO Handle failed requests, starting with auth failures...  CHECK
// TODO Work on styling CHECK
// TODO Filter out our internal playlist   CHECK
// TODO Loading more playlists    CHECK
// TODO bug: Theres a limit of 81 songs on generated playlists??    CHECK
// TODO Remember history, and list recently shuffled playlists first?
// TODO Work on styling of login screen
// TODO Add instructions
// TODO Make it look nice on mobile


const Login = ({ setAuthToken }) => {
    
    var stateKey = 'spotify_auth_state';

    /**
     * Obtains parameters from the hash of the URL
     * @return Object
     */
    function getHashParams() {
      var hashParams = {};
      var e, r = /([^&;=]+)=?([^&;]*)/g,
          q = window.location.hash.substring(1);
      while ( e = r.exec(q)) {
         hashParams[e[1]] = decodeURIComponent(e[2]);
      }
      return hashParams;
    }
    
    /**
     * Generates a random string containing numbers and letters
     * @param  {number} length The length of the string
     * @return {string} The generated string
     */
    function generateRandomString(length) {
        var text = '';
        var possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

        for (var i = 0; i < length; i++) {
            text += possible.charAt(Math.floor(Math.random() * possible.length));
        }
        return text;
    };
    
    function login() {
        var client_id = 'd37324d4e03641e3a5f23ca1acc9e952'; // Your client id
        var redirect_uri = 'http://localhost:8000/react.html'; // Your redirect uri

        var state = generateRandomString(16);

        localStorage.setItem(stateKey, state);
        var scope = 'user-read-private user-read-email user-modify-playback-state user-read-playback-state playlist-read-private playlist-read-collaborative playlist-modify-private playlist-modify-public';

        var url = 'https://accounts.spotify.com/authorize';
        url += '?response_type=token';
        url += '&client_id=' + encodeURIComponent(client_id);
        url += '&scope=' + encodeURIComponent(scope);
        url += '&redirect_uri=' + encodeURIComponent(redirect_uri);
        url += '&state=' + encodeURIComponent(state);

        window.location = url;
    }

    React.useEffect(() => {
        var params = getHashParams();
        // Delete hash params
        history.replaceState("", document.title, window.location.pathname + window.location.search);
    
        var access_token = params.access_token,
            state = params.state,
            storedState = localStorage.getItem(stateKey);
    
        console.log(access_token)
        console.log(state)
        console.log(storedState)
    
        if (access_token && (state == null || state !== storedState)) {
            alert('There was an error during the authentication');
        } else if(access_token) {
            setAuthToken(access_token);
            localStorage.setItem("access_token", access_token);
        } else {
            const stored_access_token = localStorage.getItem("access_token");
            if (stored_access_token) {
                console.log("Using stored access token");
                console.log(stored_access_token);
                setAuthToken(stored_access_token);
            }
        }
    }, []);
    return (
        <div>
            <button id="login-button" className="btn btn-primary" onClick={login}>Log in with Spotify</button>
        </div>
    )
}

const Devices = ({ makeRequest, device, setDevice }) => {
    let [devices, setDevices] = React.useState()

    React.useEffect(() => {
        makeRequest("https://api.spotify.com/v1/me/player/devices", "GET")
        .then(res => { return res.json(); })
        .then(result => {
            setDevices(result.devices)
            let active_device = result.devices[0]
            for (var i = 0; i < result.devices.length; i++) {
                var device = result.devices[i];
                if (device.is_active) {
                    active_device = device;
                    break;
                }
            }
            setDevice(active_device.id)
        });
    }, []);

    if (devices) {
        return (
            <div className="form-floating m-3">
                <select name="devices" id="devices" className={"form-select"} value={device} onChange={(e) => setDevice(e.target.value)}>
                    { devices.map(function(object, i) {
                        return <option key={object.id} value={object.id}>{object.name}</option>;
                    })}
                </select>
                <label htmlFor="devices">Device</label>
            </div>
        )
    } else {
        return (
            <p>Loading...</p>
        )
    }
}

const Playlist = ({ playlist, selected, setSourcePlaylist }) => {
    return (
        <div className={"h-100 m-1 card " + (selected ? 'text-white bg-primary' : '')} style={{width: 12 + "rem"}} onClick={() => setSourcePlaylist([playlist.id])}>
            {
                playlist.images.length > 0
                ? <img className="card-img-top" src={playlist.images[0].url} alt="Card image cap" />
                : <img className="card-img-top" src="http://localhost:8000/download.png" alt="Card image cap" />
            }
            <div className="card-body">
                <p className="card-text">{playlist.name}</p>
            </div>
        </div>
    )
}

const Playlists = ({ makeRequest, sourcePlaylist, setSourcePlaylist }) => {
    let [playlists, setPlaylists] = React.useState([])
    let [offset, setOffset] = React.useState(0)
    let [loading, setLoading] = React.useState(false)
    let [hasNext, setHasNext] = React.useState(false)

    function loadMorePlaylists() {
        const pageSize = 20;
        setLoading(true);
        makeRequest(`https://api.spotify.com/v1/me/playlists?offset=${offset}&limit=${pageSize}`, "GET")
        .then(res => { return res.json(); })
        .then(result => {
            setPlaylists(playlists => playlists.concat(result.items));
            setHasNext(Boolean(result.next));
            setLoading(false);
            setOffset(offset => offset + pageSize)
        });
    }
    
    React.useEffect(() => {
        loadMorePlaylists();
    }, []);

    if (playlists != []) {
        return (
            <div className="row rows-cols m-1 justify-content-center">
                {
                    playlists.filter(playlist => playlist.name !== "Shuffle by Album Playlist").map(function(playlist, i) {
                        return (
                            <div key={i} className="col-auto mb-4">
                                <Playlist playlist={playlist} selected={sourcePlaylist == playlist.id} setSourcePlaylist={setSourcePlaylist} />
                            </div>
                        )
                    })
                }
                {
                    hasNext &&
                        <div key="more" className="col-auto mb-4">
                            <button type="button" disabled={loading} className="btn btn-outline-info h-100 m-1" style={{width: 12 + "rem"}} onClick={() => loadMorePlaylists()}>
                                Load More Playlists
                            </button>
                            
                        </div>
                }
            </div>
        );
    } else {
        return (
            <p>Loading...</p>
        );
    }
}

const PlayButton = ({ makeRequest, device, sourcePlaylist }) => {
    
    /**
     * Shuffles array in place. ES6 version
     * @param {Array} a items An array containing the items.
     */
    function shuffle(a) {
        for (let i = a.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [a[i], a[j]] = [a[j], a[i]];
        }
        return a;
    }
    
    async function get_target_playlist_id() {
        const KEY = 'target-playlist-id';
        let playlist_id = localStorage.getItem(KEY);
        // If we remember a playlist id, verify it exists and return it if so
        if (playlist_id) {
          // Ask just for id since we are just doing a presence check
          let response = await makeRequest(`https://api.spotify.com/v1/playlists/${playlist_id}?fields=id`, "GET", null, [200, 404])
          if (response.ok) {
            return playlist_id;
          }
        }
        // If we do not remember a playlist id, or it does not exist anymore, create one
        let response = await makeRequest(`https://api.spotify.com/v1/me/playlists`, "POST", 
            {
                "name": "Shuffle by Album Playlist",
                "description": "Powers shuffle by album",
                "public": false
            }, [201]
        )
        let content = await response.json();
        localStorage.setItem(KEY, content.id);
        return content.id;
    }

    async function get_playlist_albums(source_playlist_id) {
        const limit = 100;
        let offset = 0
        let all_tracks = [];
        while(true) {
          let res = await makeRequest(`https://api.spotify.com/v1/playlists/${source_playlist_id}/tracks?fields=items(track(id,track_number,%20album(id,name))),next&offset=${offset}&limit=${limit}`, 
            "GET"
          );
          if (res.ok) {
            let content = await res.json();
            all_tracks = all_tracks.concat(content.items);
            if (content.next == null) {
              break;
            } else {
              offset += limit;
            }
          } else {
            return null;
          }
        }
        
        let albums = {};
        for (let track of all_tracks) {
          let album_id = track.track.album.id
          if (!(album_id in albums)) {
            albums[album_id] = {
              tracks: [],
              name: track.track.album.name
            }
          }
          albums[album_id].tracks.push({track_number: track.track.track_number, track_id: track.track.id})
        }
        
        return albums;

    }


    async function play_playlist(target_playlist_id) {
        makeRequest(`https://api.spotify.com/v1/me/player/play?device_id=${device}`, "PUT", {context_uri: `spotify:playlist:${target_playlist_id}`})
    }

    async function populate_target_playlist(source_playlist_id, target_playlist_id) {
        let albums = await get_playlist_albums(source_playlist_id);

        let shuffled_album_ids = shuffle(Object.keys(albums));

        var songs = [];
        for (var key of shuffled_album_ids) {
          let album = albums[key]
          album.tracks.sort((a, b) => (a.track_number > b.track_number) ? 1 : -1)
          for (var track of album.tracks) {
            songs.push("spotify:track:" + track.track_id);
          }
        }
        
        for(var i = 0; i < songs.length; i += 100) {
          var some_songs = songs.slice(i, i+100);
          if (some_songs.length == 0) {
            break;
          }
          var response = await makeRequest(`https://api.spotify.com/v1/playlists/${target_playlist_id}/tracks`, i == 0?"PUT":"POST", {uris: some_songs});
          if (!response.ok) {
            break;
          }
        }
    }

    async function click() {
        const target_playlist_id = await get_target_playlist_id();
        
        await populate_target_playlist(sourcePlaylist, target_playlist_id);
        await play_playlist(target_playlist_id);
    }

    return (
        <div className="text-center m-3">
            <button className="btn btn-success btn-lg btn-block" disabled = {!device || !sourcePlaylist} onClick={click}>Shuffle this playlist!</button>
        </div>
    )
}

const Main = ({ makeRequest }) => {
    let [device, setDevice] = React.useState()
    let [sourcePlaylist, setSourcePlaylist] = React.useState()
    return (
        <div>
            <div className="d-md-flex justify-content-md-between fixed-top d-grid gap-2 d-md-block">
                <div>
                    <PlayButton makeRequest={makeRequest} device={device} sourcePlaylist={sourcePlaylist} />
                </div>
                <div>
                    <Devices makeRequest={makeRequest} device={device} setDevice={setDevice} /> 
                </div>
            </div>
            <div style={{paddingTop:"100px", overflow: "hidden"}}>
                <Playlists makeRequest={makeRequest} sourcePlaylist={sourcePlaylist} setSourcePlaylist={setSourcePlaylist} /> 
            </div>
        </div>
    )
}

const App = () => {
    let [authToken, setAuthToken] = React.useState()
    let [errorMessage, setErrorMessage] = React.useState()

    async function makeRequest(url, method, body = null, expected=[200, 201, 204]) {
        // This is a loop in case it needs to do a retry
        while(true) {
            let response = await fetch(url, {
                method: method,
                headers: {'Content-Type': 'application/json', 'Authorization': 'Bearer ' + authToken},
                body: body ? JSON.stringify(body) : null
            });
            if (expected.includes(response.status)) {
                return response;
            } else if (response.status == 429) {
              const retryAfter = res.headers.get('retry-after');
              console.log(`Hit rate limit, sleeping for ${retryAfter} seconds`);
              await new Promise(r => setTimeout(r, retryAfter * 1000));
            } else if (response.status == 401) {
                console.error("Authn failed, clearing token");
                setAuthToken(null);
                localStorage.removeItem("access_token");
                return null;
            } else {
                const text = await response.text();
                console.error(`Fatal error: ${response.status} ${text}`);
                setErrorMessage(`Received an error when contacting Spotify; ${response.status} ${text}`);
                return null;
            }
        }
    }

    if (errorMessage) {
        return (
            <p>{errorMessage}</p>
        )
    } else if (!authToken) {
        return (
            <Login setAuthToken={setAuthToken}/>
        )
    } else {
        return (
            <Main makeRequest={makeRequest} />
        )
    }
}

const root = ReactDOM.createRoot(document.getElementById('root'))
root.render(
    <App />
);