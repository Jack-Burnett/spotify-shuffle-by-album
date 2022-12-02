// TODO Handle failed requests, starting with auth failures...
// TODO Work on styling
// TODO Filter out our internal playlist
// TODO Loading more playlists
// TODO bug: Theres a limit of 81 songs on generated playlists??
// TODO upload to github
// TODO Remember history, and list recently shuffled playlists first?


const Login = ({ authToken, setAuthToken }) => {
    
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
    
        var access_token = params.access_token,
            state = params.state,
            storedState = localStorage.getItem(stateKey);
    
        console.log(access_token)
        console.log(state)
        console.log(storedState)
    
        if (access_token && (state == null || state !== storedState)) {
            alert('There was an error during the authentication');
        } else {
            setAuthToken(access_token);
        }
    }, []);
    return (
        <div>
            <button id="login-button" className="btn btn-primary" onClick={login}>Log in with Spotify</button>
        </div>
    )
}

const Devices = ({ authToken, device, setDevice }) => {
    let [devices, setDevices] = React.useState()

    React.useEffect(() => {
        fetch("https://api.spotify.com/v1/me/player/devices", {
            method: "GET",
            headers: {'Content-Type': 'application/json', 'Authorization': 'Bearer ' + authToken}, 
        }).then(res => {
            if (res.ok) {
                return res.json();
            } else {
                throw new Error('Network response was not OK');
            }
        }).then(result => {
            console.log(result);
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
        })
        .catch((ex) => {
            console.error(ex);
        });
    }, []);

    if (devices) {
        return (
            <div>
                <select name="devices" id="devices" className={"custom-select"} value={device} onChange={(e) => setDevice(e.target.value)}>
                    { devices.map(function(object, i) {
                        return <option key={object.id} value={object.id}>{object.name}</option>;
                    })}
                </select>
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
        <div className="col-sm-2" onClick={() => setSourcePlaylist([playlist.id])}>
            <div className={"card " + (selected ? 'text-white bg-primary' : '')}>
                {
                    playlist.images.length > 0
                    ? <img className="card-img-top" src={playlist.images[0].url} alt="Card image cap" />
                    : <img className="card-img-top" src="http://localhost:8000/download.png" alt="Card image cap" />
                }
                <div className="card-body" />
                <p className="card-text">{playlist.name}</p>
            </div>
        </div>
    )
}

const Playlists = ({ authToken, sourcePlaylist, setSourcePlaylist }) => {
    let [playlists, setPlaylists] = React.useState()
    
    React.useEffect(() => {
        fetch("https://api.spotify.com/v1/me/playlists", {
            method: "GET",
            headers: {'Content-Type': 'application/json', 'Authorization': 'Bearer ' + authToken}, 
        }).then(res => {
            if (res.ok) {
                return res.json();
            } else {
                throw new Error('Network response was not OK');
            }
        }).then(result => {
            console.log(result.items);
            setPlaylists(result.items);
        })
        .catch(() => {
            console.log("Booo");
        });
    }, []);

    if (playlists) {
        return (
            <div className="row">
                { 
                    playlists.map(function(object, i) {
                        return <Playlist key={i} playlist={object} selected={sourcePlaylist == object.id} setSourcePlaylist={setSourcePlaylist} />
                    })
                }
            </div>
        );
    } else {
        return (
            <p>Loading...</p>
        );
    }
}

const PlayButton = ({ authToken, device, sourcePlaylist }) => {
    
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
          let response = await fetch(`https://api.spotify.com/v1/playlists/${playlist_id}?fields=id`, {
            method: "GET",
            headers: {'Content-Type': 'application/json', 'Authorization': 'Bearer ' + authToken}, 
          });
          if (response.ok) {
            return playlist_id;
          }
        }
        // If we do not remember a playlist id, or it does not exist anymore, create one
        let response = await fetch(`https://api.spotify.com/v1/me/playlists`, {
          method: "POST",
          headers: {'Content-Type': 'application/json', 'Authorization': 'Bearer ' + authToken},
          body: JSON.stringify({
            "name": "Shuffle by Album Playlist",
            "description": "Powers shuffle by album",
            "public": false
          })
        });
        let content = await response.json();
        localStorage.setItem(KEY, content.id);
        return content.id;
      }

      async function get_playlist_albums(source_playlist_id) {
        const limit = 100;
        let offset = 0
        let all_tracks = [];
        while(true) {
          let res = await fetch(`https://api.spotify.com/v1/playlists/${source_playlist_id}/tracks?fields=items(track(id,track_number,%20album(id,name))),next&offset=${offset}&limit=${limit}`, {
            method: "GET",
            headers: {'Content-Type': 'application/json', 'Authorization': 'Bearer ' + authToken}, 
          });
          if (res.status == 429) {
            console.log(res)
            const retryAfter = res.headers.get('retry-after');
            console.log(`Hit rate limit, sleeping for ${retryAfter} seconds`);
            await new Promise(r => setTimeout(r, retryAfter * 1000));
          } else if (res.ok) {
            let content = await res.json();
            all_tracks = all_tracks.concat(content.items);
            if (content.next == null) {
              break;
            } else {
              offset += limit;
            }
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
        await fetch(`https://api.spotify.com/v1/me/player/play?device_id=${device}`, {
          method: "PUT",
          headers: {'Content-Type': 'application/json', 'Authorization': 'Bearer ' + authToken}, 
          // TODO care about device
          body: JSON.stringify({context_uri: `spotify:playlist:${target_playlist_id}`})
        });
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
          // TODO error handling?
          if (i == 0) {
            const response = await fetch(`https://api.spotify.com/v1/playlists/${target_playlist_id}/tracks`, {
                  method: "PUT",
                  headers: {'Content-Type': 'application/json', 'Authorization': 'Bearer ' + authToken}, 
                  body: JSON.stringify({uris: some_songs})
            });
          } else {
            const response = await fetch(`https://api.spotify.com/v1/playlists/${target_playlist_id}/tracks`, {
                  method: "POST",
                  headers: {'Content-Type': 'application/json', 'Authorization': 'Bearer ' + authToken}, 
                  body: JSON.stringify({uris: some_songs})
            });
          }
        }

      }

      async function click() {
        const target_playlist_id = await get_target_playlist_id();
        
        await populate_target_playlist(sourcePlaylist, target_playlist_id);
        await play_playlist(target_playlist_id);
      }

    return (
        <div>
            <button className="btn btn-success btn-lg" disabled = {!device || !sourcePlaylist} onClick={click}>Shuffle this playlist!</button>
        </div>
    )
}

const Main = ({ authToken }) => {
    let [device, setDevice] = React.useState()
    let [sourcePlaylist, setSourcePlaylist] = React.useState()
    return (
        <div>
            <PlayButton authToken={authToken} device={device} sourcePlaylist={sourcePlaylist} />
            <Devices authToken={authToken} device={device} setDevice={setDevice} /> 
            <Playlists authToken={authToken} sourcePlaylist={sourcePlaylist} setSourcePlaylist={setSourcePlaylist} /> 
        </div>
    )
}

const App = () => {
    let [authToken, setAuthToken] = React.useState()
    if (!authToken) {
        return (
            <Login authToken={authToken} setAuthToken={setAuthToken}/>
        )
    } else {
        return (
            <Main authToken={authToken} />
        )
    }
}

const root = ReactDOM.createRoot(document.getElementById('root'))
root.render(
    <App />
);