#!/usr/bin/python
import json as json
import re
import time

from bs4 import BeautifulSoup as bs
from urllib import urlopen, urlencode, quote


host = 'https://commons.wikimedia.org/w/api.php'

offset = 0
images = []

while offset is not None:
    print ">>> %s/6074" % offset
    data = urlencode({
            'action'     : 'query',
            'format'     : 'json',
            'list'       : 'search',
            'srnamespace': 6,
            'srsearch'   : 'katowice',
            'sroffset'   : offset
            })
    
    search_results = {}
    while not search_results or 'error' in search_results:
        # read stringified json result
        search_results = urlopen(host, data).read()
        # serialize it as python dictionary
        search_results = json.loads(search_results)

    for hit in search_results['query']['search']:
        if hit['title'][-3:].lower() == 'svg' or hit['title'][:5] != 'File:':
            continue
        
        title = hit['title'][5:-4]
        desc  = re.sub(r"<[^>]*>", "", hit['snippet'])
        url   = 'http://commons.wikimedia.org/wiki/' + hit['title']
        fname = hit['title'][5:]
        
        images.append((title, desc, url, fname))
        
        if 'query-continue' in search_results:
            offset = search_results['query-continue']['search']['sroffset']
        else:
            offset = None

with open('photos.csv', 'w') as f:
    for img in images:
        row = ';'.join('"%s"' % e.encode('utf-8') for e in img)
        f.write(row)
        f.write('\n')

        fname = img[-1].replace(' ', '_')
        print ">>> Downloading: %s" % fname
        data = urlencode({
                'action' : 'query',
                'list'   : 'allimages',
                'aifrom' : fname.encode('utf-8'),
                'ailimit': 1,
                'format' : 'json'
                })

        search_results = {}
        time_now = time.time()
        while (time.time() - time_now < 5) and (not search_results or 'error' in search_results):
            # read stringified json result
            search_results = urlopen(host, data).read()
            # serialize it as python dictionary
            search_results = json.loads(search_results)

        img_url = search_results['query']['allimages'][0]['url']
        
        with open("./photos/%s" % fname, 'wb') as img_f:
            time_now = time.time()
            img_data = ''
            while (time.time() - time_now < 5) and (img_data == '' or img_data.startswith('<!DOCTYPE HTML PUBLIC')):
                img_data = urlopen(img_url).read()
            img_f.write(img_data)
