#!/bin/bash

# Update the list of domains from the public suffix list
curl --silent https://publicsuffix.org/list/public_suffix_list.dat |
    grep -v '^//' | # Remove comments
    grep -v '^$'  | # Remove empty lines
    grep -v '\.'  | # Remove lines with dots
    sort          | # Remove duplicates
    uniq > tlds.dat
